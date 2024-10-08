import { BasicException } from "@/functions/http-client/exceptions"
import { Response, ListResult } from "@/functions/http-client"
import { arrays } from "@/utils/primitives"
import { createEmitter, Emitter } from "@/utils/emitter"
import { ErrorHandler } from "../install"

// == Query Instance 分层：查询实例 ==
// 一个instance代表查询条件固定情况下的一组列表查询，在内部以segment的形式分段查询并缓存数据。
// instance本身不是composition AP，且不耦合fetch manager。

export interface QueryInstanceOptions<T, KEY, E extends BasicException> extends QueryArguments<T, KEY, E> {
    /**
     * 通过此函数回调数据源的查询结果。因为实例与查询条件一一对应，此函数应闭包查询条件，其查询参数只能分页。
     */
    request(offset: number, limit: number): Promise<Response<ListResult<T>, E>>
}

export interface QueryArguments<T, KEY, E extends BasicException> {
    /**
     * 取得一个项的唯一key。
     */
    keyOf(item: T): KEY
    /**
     * 查询中发生错误时，提交给此函数捕获。
     */
    handleError?: ErrorHandler<E>
    /**
     * 数据段大小。段指在内部实现中将数据平均切割后的一份，用于优化数据整体查询。
     */
    segmentSize?: number
}

export interface QueryInstance<T, KEY> {
    /**
     * 查询指定单条数据。
     * 优先从缓存取数据，如果没有缓存，则会立刻加载segment。
     * @return 返回此记录。如果没有找到此记录，返回undefined
     */
    queryOne(index: number): Promise<T | null>
    /**
     * 取得指定范围的数据。
     * 优先从缓存取数据，如果没有缓存，则会立刻加载segment。
     * 如果超出最大数据范围，那么只会返回数据范围内的数据。
     */
    queryRange(offset: number, limit: number): Promise<T[]>
    /**
     * 取得指定index列表的数据。
     * 优先从缓存取数据，如果没有缓存，则会立刻加载segment。
     * 如果超出最大数据范围，那么记录不会在结果中返回，因此必须保证取的数据都是可用的。
     */
    queryList(indexList: number[]): Promise<T[]>
    /**
     * 根据key查找指定的项。
     * @param key 要查找的KEY
     * @param priorityRange 指定一个中轴offset或指定[start, end)范围作为优先查找范围。查询会从这个范围开始向两侧逐步扩张直到匹配目标。
     * @param maxRange 指定一个半区延展量(从优先查找范围两端向外延伸)或指定[start, end)范围作为最大查找范围。作为可以加载数据的查找，如果不限范围，它可能载入全部的数据。
     */
    findByKey(key: KEY, priorityRange?: number | [number, number], maxRange?: number | [number, number]): Promise<number | undefined>
    /**
     * 查询指定范围的数据是否是已加载的状态。
     */
    isRangeLoaded(offset: number, limit: number): LoadedStatus
    /**
     * 获取数据总量。
     */
    count(): Promise<number>
    /**
     * 对已存在的数据执行的操作。全部都是同步操作，支持同步查询以及同步修改，但这并不是实际修改，只是在修改缓存数据。
     */
    sync: SyncOperations<T, KEY>
    /**
     * 变化事件。发生任意数据变更时，发送事件通知。
     */
    modifiedEvent: Emitter<ModifiedEvent<T>>
}

export interface SyncOperations<T, KEY> {
    /**
     * 获得数据总量。只有在至少执行了一次查询后，才能获得总量，否则将返回null。
     */
    count(): number | null
    /**
     * 根据表达式条件查找指定的项。它只会在已经加载的项中查找，并可以指定优先范围。
     * @param condition 匹配条件
     * @param priorityRange 指定一个offset或指定[start, end)范围作为优先查找范围。查询会从这个范围开始向两侧逐步扩张直到匹配目标。
     * @return 返回项的index，也就是offset。没有查找到指定项就会返回undefined。
     */
    find(condition:  (data: T) => boolean, priorityRange?: number | [number, number]): number | undefined
    /**
     * 根据key查找指定的项。它只会在已经加载的项中查找。
     * @return 返回项的index，也就是offset。没有查找到指定项就会返回undefined。
     */
    findByKey(key: KEY): number | undefined
    /**
     * 查找指定位置处的项。如果项不存在，或者未加载，则返回undefined。
     */
    retrieve(index: number): T | undefined
    /**
     * 替换数据列表中指定位置处的项。
     * @return 是否成功替换
     */
    modify(index: number, newData: T): boolean
    /**
     * 从数据列表中删除指定位置处的项。后面的项会前移一位。
     * 如果后一个段是not loaded的段，会导致当前段会被重新标记为not loaded，使其重新加载数据。
     * @return 是否成功删除
     */
    remove(index: number): boolean
}

export function createQueryInstance<T, KEY, E extends BasicException>(options: QueryInstanceOptions<T, KEY, E>): QueryInstance<T, KEY> {
    const segmentSize = options.segmentSize ?? 100

    const datasource = createDatasource(options)

    const segments = createSegments(datasource, segmentSize)

    const modifiedEvent = createEmitter<ModifiedEvent<T>>()

    return {
        async queryOne(index: number): Promise<T | null> {
            const ok = await segments.loadData(index, 1)
            return ok ? datasource.data.buffer[index] : null
        },
        async queryRange(offset: number, limit: number): Promise<T[]> {
            const ok = await segments.loadData(offset, limit)
            return ok ? datasource.data.buffer.slice(offset, Math.min(offset + limit, datasource.data.total!)) : []
        },
        async queryList(indexList: number[]): Promise<T[]> {
            const result: T[] = []
            for (const [i, index] of indexList.entries()) {
                const ok = await segments.loadData(index, 1)
                if(ok && index < datasource.data.total!) result[i] = datasource.data.buffer[index]
            }
            return result
        },
        async findByKey(key: KEY, priorityRange?: number | [number, number], maxRange?: number | [number, number]): Promise<number | undefined> {
            const directReturn = datasource.map.get(key)
            if(directReturn !== undefined) return directReturn[0]

            //在开始之前如果数据量为null，则首先进行一次初始化，获得count
            if(datasource.data.total === null && !await segments.loadData(0, segmentSize)) return undefined
            //segment总分片数
            const segmentCount = Math.ceil(datasource.data.total! / segmentSize)
            //根据当前的数据显示范围计算搜索起始的段位置
            const [lowerBound, upperBound] = calcPriorityRange(priorityRange, segmentCount, segmentSize)
            //扩展得到搜索的最大限制段位置
            const [lowerLimit, upperLimit] = calcMaxRange(priorityRange, maxRange, segmentCount, segmentSize)

            //首先加载整个起始搜索位置
            {
                if(!await segments.loadData(lowerBound * segmentSize, upperBound * segmentSize)) return undefined
                const directReturn = datasource.map.get(key)
                if(directReturn !== undefined) return directReturn[0]
            }
            //如果不行，就从lower和upper向两侧迭代
            for(let lower = lowerBound - 1, upper = upperBound; lower >= lowerLimit || upper < upperLimit;) {
                if(lower >= lowerLimit) {
                    if(!await segments.loadData(lower * segmentSize, (lower + 1) * segmentSize)) return undefined
                    const directReturn = datasource.map.get(key)
                    if(directReturn !== undefined) return directReturn[0]
                    lower -= 1
                }
                if(upper < upperLimit) {
                    if(!await segments.loadData(upper * segmentSize, (upper + 1) * segmentSize)) return undefined
                    const directReturn = datasource.map.get(key)
                    if(directReturn !== undefined) return directReturn[0]
                    upper += 1
                }
            }
            return undefined
        },
        async count() {
            const ok = await segments.loadData(0, segmentSize)
            return ok ? datasource.data.total! : 0
        },
        isRangeLoaded(offset: number, limit: number): LoadedStatus {
            return segments.isDataLoaded(offset, limit)
        },
        sync: {
            count(): number | null {
                return datasource.data.total
            },
            find(condition, priorityRange): number | undefined {
                if(datasource.data.total == null) return undefined
                //segment总分片数
                const segmentCount = Math.ceil(datasource.data.total / segmentSize)
                const segmentList = segments.getSegments()

                function findInSegment(segmentIndex: number): number | undefined {
                    if(segmentList[segmentIndex]?.status === SegmentStatus.LOADED) {
                        const begin = segmentIndex * segmentSize, end = Math.min((segmentIndex + 1) * segmentSize, datasource.data.total!)
                        for(let i = begin; i < end; ++i) {
                            const data = datasource.data.buffer[i]
                            if(data != undefined && condition(data)) {
                                return i
                            }
                        }
                    }
                    return undefined
                }

                //根据当前的数据显示范围计算搜索起始的段位置
                const [lowerBound, upperBound] = calcPriorityRange(priorityRange, segmentCount, segmentSize)
                //首先在这些段中搜索
                for(let i = lowerBound; i < upperBound; ++i) {
                    const result = findInSegment(i)
                    if(result != undefined) return result
                }
                //没有结果后，从lower和upper向两侧迭代
                for(let lower = lowerBound - 1, upper = upperBound; lower >= 0 || upper < segmentCount;) {
                    if(lower >= 0) {
                        const result = findInSegment(lower)
                        if(result != undefined) return result
                        lower -= 1
                    }
                    if(upper < segmentCount) {
                        const result = findInSegment(upper)
                        if(result != undefined) return result
                        upper += 1
                    }
                }
                return undefined
            },
            findByKey(key: KEY): number | undefined {
                const ret = datasource.map.get(key)
                return ret !== undefined ? ret[0] : undefined
            },
            retrieve(index: number): T | undefined {
                if(index >= 0 && datasource.data.total != null && index < datasource.data.total) {
                    return datasource.data.buffer[index]
                }
                return undefined
            },
            modify(index: number, newData: T): boolean {
                if(index >= 0 && datasource.data.total != null && index < datasource.data.total) {
                    const segment = Math.floor(index / segmentSize)
                    if(segments.getSegments()[segment]?.status === SegmentStatus.LOADED) {
                        const oldValue = datasource.data.buffer[index]
                        datasource.data.buffer[index] = newData
                        modifiedEvent.emit({type: "MODIFY", index, value: newData, oldValue})
                        return true
                    }
                }
                return false
            },
            remove(index: number): boolean {
                if(datasource.data.total != null && index >= 0 && index < datasource.data.total) {
                    //发生更改的数据项的段位置和总段数
                    const segmentIndex = Math.floor(index / segmentSize), segmentCount = Math.ceil(datasource.data.total / segmentSize)
                    const segmentList = segments.getSegments()
                    for(let i = segmentIndex; i < segmentCount; ++i) {
                        const segment = segmentList[i]
                        if(segment != undefined && segment.status === SegmentStatus.LOADED) {
                            //如果某个段后面的一个段的首条数据是undefined，那么这个段需要被标记为not loaded
                            if(datasource.data.buffer[(i + 1) * segmentSize] == undefined) {
                                segment.status = SegmentStatus.NOT_LOADED
                                segment.callbacks.splice(0, segment.callbacks.length)
                            }
                        }
                    }
                    //移除数据项
                    const [oldValue] = datasource.data.buffer.splice(index, 1)
                    datasource.data.total -= 1
                    //调整map缓存的索引值
                    for(let i = index; i < datasource.data.total; ++i) {
                        const item = datasource.data.buffer[i]
                        if(item !== undefined) {
                            const key = options.keyOf(item)
                            const cache = datasource.map.get(key)
                            if(cache === undefined || cache[0] !== i) datasource.map.set(key, [i, item])
                        }
                    }
                    modifiedEvent.emit({type: "REMOVE", index, oldValue})
                    return true
                }
                return false
            }
        },
        modifiedEvent
    }
}

function createSegments({ data, pull }: ReturnType<typeof createDatasource>, segmentSize: number) {
    let segments: Segment[] = []

    const getSegments = () => segments

    const loadData = async (offset: number, limit: number): Promise<boolean> => {
        const { begin, end } = calcSegmentRangeByOffset(offset, limit)

        const { requiredSegments, loadingSegments } = classifySegments(begin, end)

        let leaveSegmentCount = requiredSegments.length + loadingSegments.length

        if(leaveSegmentCount <= 0) {
            return true
        }

        return new Promise<boolean>(resolve => {
            let isResolved = false

            //提供给某一个segment注册的回调函数
            const segmentCallback = (ok: boolean) => {
                if(!isResolved) {
                    if(ok) {
                        //如果回调是true，表示当前的segment已经准备完成，使leave数量减1
                        leaveSegmentCount -= 1
                        if(leaveSegmentCount <= 0) {
                            //数量减少到0表示所有segment都已经准备完成，可以完成总回调
                            isResolved = true
                            resolve(true)
                        }
                    }else{
                        //如果回调是false，表示因为error或cancel，此次查询应当被取消，那么直接返回，不再等待所有回调完成
                        isResolved = true
                        resolve(false)
                    }
                }
            }

            for(const segment of loadingSegments) {
                segment.callbacks.push(segmentCallback)
            }
            for(const segment of requiredSegments) {
                segment.status = SegmentStatus.LOADING
                segment.callbacks = [segmentCallback]
            }

            //将需要请求的segment按照连续性分割成数个分片
            const splits = arrays.split(requiredSegments, (a, b) => b.index - a.index > 1)
            for (const split of splits) {
                //计算出每个分片的数据范围
                const offset = split[0].index * segmentSize, limit = (split[split.length - 1].index + 1) * segmentSize - offset
                //发起查询请求
                pull(offset, limit).then(ok => pullCallback(split, ok))
            }
        })
    }

    const isDataLoaded = (offset: number, limit: number): LoadedStatus => {
        const { begin, end } = calcSegmentRangeByOffset(offset, limit)

        const { loadedSegments, loadingSegments, requiredSegments } = classifySegments(begin, end)

        if(loadingSegments.length <= 0 && requiredSegments.length <= 0) {
            return LoadedStatus.LOADED
        }else if(loadedSegments.length <= 0) {
            return LoadedStatus.NOT_LOADED
        }else{
            return LoadedStatus.PARTIALLY_LOADED
        }
    }

    function calcSegmentRangeByOffset(offset: number, limit: number) {
        //计算出正确的范围，避免超出总量，导致出现不应该出现的segment
        const beginItem = offset < 0 ? 0 : data.total != null && offset > data.total ? data.total : offset
        const endItem = offset + limit < 0 ? 0 : data.total != null && offset + limit > data.total ? data.total : offset + limit
        //计算segment的范围
        const begin = Math.floor(beginItem / segmentSize), end = Math.ceil(endItem / segmentSize)

        return {begin, end}
    }

    function classifySegments(begin: number, end: number) {
        const requiredSegments: Segment[] = []
        const loadingSegments: Segment[] = []
        const loadedSegments: Segment[] = []

        for(let i = begin; i < end; ++i) {
            const segment = segments[i]
            if(!segment || segment.status === SegmentStatus.NOT_LOADED) {
                //not loaded的segment
                requiredSegments.push(segments[i] = createSegment(i))
            }else if(segment.status === SegmentStatus.LOADING) {
                //loading的segment
                loadingSegments.push(segment)
            }else{
                //loaded的segment
                loadedSegments.push(segment)
            }
        }

        return {requiredSegments, loadingSegments, loadedSegments}
    }

    function createSegment(index: number) {
        return {
            index,
            status: SegmentStatus.NOT_LOADED,
            callbacks: []
        }
    }

    function pullCallback(split: Segment[], ok: boolean) {
        for(const segment of split) {
            segment.status = ok ? SegmentStatus.LOADED : SegmentStatus.NOT_LOADED
            for(const callback of segment.callbacks) {
                callback(ok)
            }
        }
    }

    return {getSegments, loadData, isDataLoaded}
}

function createDatasource<T, KEY, E extends BasicException>({ request, keyOf, handleError }: QueryInstanceOptions<T, KEY, E>) {
    const data = <{buffer: T[], total: number | null}>{buffer: [], total: null}
    const map = new Map<KEY, [number, T]>()

    const pull = async (offset: number, limit: number): Promise<boolean> => {
        const res = await request(offset, limit)
        if(res.ok) {
            data.total = res.data.total
            for(let i = 0; i < res.data.result.length; ++i) {
                const item = res.data.result[i]
                const key = keyOf(item)
                data.buffer[offset + i] = item
                map.set(key, [offset + i, item])
            }
            return true
        }else{
            handleError?.(res.exception)
            return false
        }
    }

    return {data, map, pull}
}

function calcPriorityRange(priorityRange: number | [number, number] | undefined, segmentCount: number, segmentSize: number): [number, number] {
    if(typeof priorityRange === "number") {
        return [Math.floor(priorityRange / segmentSize), Math.ceil(priorityRange / segmentSize)]
    }else if(typeof priorityRange === "object") {
        const [begin, end] = priorityRange
        return [Math.floor(begin / segmentSize), Math.ceil(end / segmentSize)]
    }else{
        return [0, segmentCount]
    }
}

function calcMaxRange(priorityRange: number | [number, number] | undefined, maxRange: number | [number, number] | undefined, segmentCount: number, segmentSize: number): [number, number] {
    if(typeof maxRange === "object") {
        const [begin, end] = maxRange
        return [Math.floor(begin / segmentSize), Math.ceil(end / segmentSize)]
    }else if(typeof maxRange === "number") {
        if(typeof priorityRange === "number") {
            return [Math.floor(Math.max(0, priorityRange - maxRange) / segmentSize), Math.ceil((priorityRange + maxRange) / segmentSize)]
        }else if(typeof priorityRange === "object") {
            const [begin, end] = priorityRange
            return [Math.floor(Math.max(0, begin - maxRange) / segmentSize), Math.ceil((end + maxRange) / segmentSize)]
        }else{
            return [0, segmentCount]
        }
    }else{
        return [0, segmentCount]
    }
}

export enum LoadedStatus {
    NOT_LOADED,
    PARTIALLY_LOADED,
    LOADED
}

export enum SegmentStatus {
    NOT_LOADED,
    LOADING,
    LOADED
}

export type ModifiedEvent<T> = {
    type: "MODIFY"
    index: number
    value: T
    oldValue: T
} | {
    type: "REMOVE"
    index: number
    oldValue: T
}

interface Segment {
    index: number
    status: SegmentStatus
    callbacks: ((ok: boolean) => void)[]
}
