import { HttpInstance, Response } from "../instance"
import { NotFound } from "../exceptions"
import { IllustQueryType } from "./illust"
import { date, LocalDate } from "@/utils/datetime"

export function createPartitionEndpoint(http: HttpInstance): PartitionEndpoint {
    return {
        list: http.createQueryRequest("/api/partitions", "GET", {
            parseQuery: mapFromPartitionFilter,
            parseResponse: d => (<any[]>d).map(mapToPartition)
        }),
        monthList: http.createRequest("/api/partitions/months"),
        get: http.createPathRequest(d => `/api/partitions/${date.toISOString(d)}`, "GET", {
            parseResponse: mapToPartition
        })
    }
}

function mapFromPartitionFilter(filter: PartitionFilter) {
    return {
        gte: filter.gte && date.toISOString(filter.gte),
        lt: filter.lt && date.toISOString(filter.lt),
        query: filter.query,
        type: filter.type
    }
}

function mapToPartition(data: any): Partition {
    return {
        date: date.of(<string>data["date"]),
        count: <number>data["count"]
    }
}

/**
 * 分区。
 */
export interface PartitionEndpoint {
    /**
     * 查询分区列表。
     */
    list(filter: PartitionFilter): Promise<Response<Partition[]>>
    /**
     * 查询月份列表。
     */
    monthList(): Promise<Response<PartitionMonth[]>>
    /**
     * 查看分区。
     * @exception NOT_FOUND
     */
    get(id: LocalDate): Promise<Response<Partition, NotFound>>
}

export interface Partition {
    date: LocalDate
    count: number
}

export interface PartitionMonth {
    year: number
    month: number
    dayCount: number
    count: number
}

export interface PartitionFilter {
    gte?: LocalDate
    lt?: LocalDate
    query?: string
    type?: IllustQueryType
}
