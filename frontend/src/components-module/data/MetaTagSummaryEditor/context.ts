import { computed, onBeforeMount, onMounted, reactive, ref, Ref, watch } from "vue"
import { flatResponse } from "@/functions/http-client"
import { Tagme } from "@/functions/http-client/api/illust"
import { RelatedSimpleTopic, SimpleTopic } from "@/functions/http-client/api/topic"
import { RelatedSimpleAuthor, SimpleAuthor } from "@/functions/http-client/api/author"
import { RelatedSimpleTag, SimpleTag } from "@/functions/http-client/api/tag"
import { IdentityType, MetaTagTypeValue, MetaType } from "@/functions/http-client/api/all"
import { MetaUtilIdentity, MetaUtilResult, MetaUtilValidation } from "@/functions/http-client/api/util-meta"
import { BatchQueryResult, SourceMappingTargetDetail } from "@/functions/http-client/api/source-tag-mapping"
import { useFetchHelper, useFetchReactive, usePostFetchHelper, usePostPathFetchHelper, useQueryContinuousListView } from "@/functions/fetch"
import { useLocalStorage } from "@/functions/app"
import { useToast } from "@/modules/toast"
import { useInterceptedKey } from "@/modules/keyboard"
import { useTagTreeSearch } from "@/services/common/tag"
import { installation, toRef } from "@/utils/reactivity"
import { sleep } from "@/utils/process"
import { objects } from "@/utils/primitives"
import { useMessageBox } from "@/modules/message-box";

export type SetValue = (form: SetDataForm) => Promise<boolean>

export interface SetDataForm {
    topics?: number[]
    authors?: number[]
    tags?: number[]
    tagme?: Tagme[]
}

export interface UpdateDataForm {
    topics?: RelatedSimpleTopic[]
    authors?: RelatedSimpleAuthor[]
    tags?: RelatedSimpleTag[]
    tagme?: Tagme[]
}

interface Data {
    topics: RelatedSimpleTopic[]
    authors: RelatedSimpleAuthor[]
    tags: RelatedSimpleTag[]
    tagme: Tagme[]
}

interface MetaTagReflection {
    tag: SimpleTag
    topic: SimpleTopic
    author: SimpleAuthor
}

interface InstallEditorContext {
    identity: Ref<MetaUtilIdentity | null>
    data: Readonly<Ref<Data>>
    setValue?: SetValue
    updateValue(form: UpdateDataForm): void
    close(): void
}

export const [installEditorContext, useEditorContext] = installation(function (context: InstallEditorContext) {
    const storage = useLocalStorage<{
        typeFilter: {tag: boolean, author: boolean, topic: boolean}
        tab: "db" | "recent" | "suggest" | "source"
        tabDBType: "author" | "tag" | "topic"
    }>("detail-view/meta-tag-editor/storage", () => ({
        typeFilter: {tag: true, topic: true, author: true},
        tab: "db",
        tabDBType: "author"
    }), true)

    const typeFilter = toRef(storage, "typeFilter")
    const tab = toRef(storage, "tab")
    const tabDBType = toRef(storage, "tabDBType")

    const form = useFormData(context)

    return {identity: context.identity, typeFilter, tab, tabDBType, form}
})

function useFormData(context: InstallEditorContext) {
    const toast = useToast()
    const postIdentityHistory = usePostFetchHelper(client => client.metaUtil.history.identities.push)
    const postMetaTagHistory = usePostFetchHelper(client => client.metaUtil.history.metaTags.push)

    const tags = ref<SimpleTag[]>([])
    const topics = ref<SimpleTopic[]>([])
    const authors = ref<SimpleAuthor[]>([])
    const tagme = ref<Tagme[]>([])
    const changed = reactive({tag: false, topic: false, author: false, tagme: false})

    const submittable = computed(() =>
        (changed.tag || changed.topic || changed.author || changed.tagme) &&
        (validation.validationResults.value == undefined || (!validation.validationResults.value.forceConflictingMembers.length && !validation.validationResults.value.notSuitable.length)))

    const history = useDataHistory(tags, topics, authors, context.data)
    const validation = useFormValidation(tags, topics, authors, context.data)

    watch(context.data, d => {
        tags.value = d?.tags?.filter(t => !t.isExported) ?? []
        topics.value = d?.topics?.filter(t => !t.isExported) ?? []
        authors.value = d?.authors?.filter(t => !t.isExported) ?? []
        tagme.value = d?.tagme ?? []
        changed.tag = false
        changed.topic = false
        changed.author = false
        changed.tagme = false
    }, {immediate: true})

    const setTagme = (value: Tagme[]) => {
        tagme.value = value
        changed.tagme = true
    }

    function add<T extends keyof MetaTagReflection>(type: T, metaTag: MetaTagReflection[T]) {
        if(type === "tag") {
            const tag = metaTag as SimpleTag
            if(!tags.value.find(i => i.id === tag.id)) {
                tags.value.push(tag)
                history.addRecord({type: "tag", value: tag, action: "add"})
            }
            changed.tag = true
        }else if(type === "author") {
            const author = metaTag as SimpleAuthor
            if(!authors.value.find(i => i.id === author.id)) {
                authors.value.push(author)
                history.addRecord({type: "author", value: author, action: "add"})
            }
            changed.author = true
        }else if(type === "topic") {
            const topic = metaTag as SimpleTopic
            if(!topics.value.find(i => i.id === topic.id)) {
                topics.value.push(topic)
                history.addRecord({type: "topic", value: topic, action: "add"})
            }
            changed.topic = true
        }
    }

    function addAll(records: MetaTagTypeValue[]) {
        const finalRecords: MetaTagTypeValue[] = []
        for(const record of records) {
            if(record.type === "tag") {
                const tag = record.value
                if(!tags.value.find(i => i.id === tag.id)) {
                    tags.value.push(tag)
                    finalRecords.push(record)
                }
                changed.tag = true
            }else if(record.type === "author") {
                const author = record.value
                if(!authors.value.find(i => i.id === author.id)) {
                    authors.value.push(author)
                    finalRecords.push(record)
                }
                changed.author = true
            }else if(record.type === "topic") {
                const topic = record.value
                if(!topics.value.find(i => i.id === topic.id)) {
                    topics.value.push(topic)
                    finalRecords.push(record)
                }
                changed.topic = true
            }
        }
        if(finalRecords.length) {
            history.addRecord(finalRecords.map(r => ({...r, action: "add"})))
        }
    }

    const removeAt = (type: keyof MetaTagReflection, index: number) => {
        if(type === "tag") {
            const [tag] = tags.value.splice(index, 1)
            history.addRecord({type: "tag", value: tag, action: "remove", index})
            changed.tag = true
        }else if(type === "topic") {
            const [topic] = topics.value.splice(index, 1)
            history.addRecord({type: "topic", value: topic, action: "remove", index})
            changed.topic = true
        }else if(type === "author") {
            const [author] = authors.value.splice(index, 1)
            history.addRecord({type: "author", value: author, action: "remove", index})
            changed.author = true
        }
    }

    const submit = async () => {
        if(submittable.value) {
            //在提交更改之前就记录下变化统计数据，因为在提交更改后，历史记录栈会被清空
            const metaChangedHistory = history.getHistoryRecords()
            if(context.setValue) {
                const ok = await context.setValue({
                    tags: changed.tag ? tags.value.map(i => i.id) : undefined,
                    topics: changed.topic ? topics.value.map(i => i.id) : undefined,
                    authors: changed.author ? authors.value.map(i => i.id) : undefined,
                    tagme: changed.tagme ? tagme.value : undefined
                })

                if(ok) {
                    //发送编辑器历史记录所需的统计数据
                    const identity = context.identity.value
                    if(identity !== null) postIdentityHistory(identity, toast.handleException).finally()
                    //将编辑器撤销栈里的内容发送到标签使用记录
                    const metaTags = metaChangedHistory.map(({ type, value }) => ({type: type.toUpperCase() as MetaType, id: value.id}))
                    postMetaTagHistory(metaTags, toast.handleException).finally()
                    //保存成功
                    context.close()
                }
            }

            context.updateValue({
                tags: changed.tag ? tags.value.map(i => ({...i, isExported: false})) : undefined,
                topics: changed.topic ? topics.value.map(i => ({...i, isExported: false})) : undefined,
                authors: changed.author ? authors.value.map(i => ({...i, isExported: false})) : undefined,
                tagme: changed.tagme ? tagme.value : undefined
            })

            context.close()
        }
    }

    useInterceptedKey("Meta+Enter", submit)

    return {tags, topics, authors, tagme, setTagme, add, addAll, removeAt, submittable, submit, validation, history}
}

function useFormValidation(tags: Ref<SimpleTag[]>, topics: Ref<SimpleTopic[]>, authors: Ref<SimpleAuthor[]>, data: Ref<Data>) {
    const toast = useToast()

    const fetch = useFetchHelper({
        request: client => client.metaUtil.validate,
        handleErrorInRequest: toast.handleException
    })

    const validationResults = ref<{
        notSuitable: MetaUtilValidation["notSuitable"],
        conflictingMembers: MetaUtilValidation["conflictingMembers"],
        forceConflictingMembers: MetaUtilValidation["forceConflictingMembers"]
    }>()
    const exportedResults = ref<{
        tags: SimpleTag[],
        topics: SimpleTopic[],
        authors: SimpleAuthor[]
    }>({tags: [], topics: [], authors: []})

    const validateFlag = ref({tag: false, topic: false, author: false})

    watch(tags, () => validateFlag.value.tag = true, {deep: true})
    watch(topics, () => validateFlag.value.topic = true, {deep: true})
    watch(authors, () => validateFlag.value.author = true, {deep: true})

    watch(validateFlag, async (flag, __, onInvalidate) => {
        if(flag.tag || flag.topic || flag.author) {
            let invalidate = false
            onInvalidate(() => invalidate = true)

            await sleep(500)
            if(invalidate) return

            validate(flag).finally()
            validateFlag.value = {tag: false, topic: false, author: false}
        }
    }, {deep: true})

    onMounted(() => {
        if(tags.value.length || topics.value.length || authors.value.length) {
            validate({tag: tags.value.length > 0, topic: topics.value.length > 0, author: authors.value.length > 0}).finally()
        }
    })

    const validate = async (flag: {tag: boolean, topic: boolean, author: boolean}) => {
        const res = await fetch({
            tags: flag.tag ? tags.value.map(t => t.id) : null,
            topics: flag.topic ? topics.value.map(t => t.id) : null,
            authors: flag.author ? authors.value.map(t => t.id) : null
        })
        if(res !== undefined) {
            if(flag.tag) {
                validationResults.value = {
                    notSuitable: res.notSuitable,
                    conflictingMembers: res.conflictingMembers,
                    forceConflictingMembers: res.forceConflictingMembers
                }
                exportedResults.value.tags = res.tags.filter(i => i.isExported)
            }
            if(flag.topic) {
                exportedResults.value.topics = res.topics.filter(i => i.isExported)
            }
            if(flag.author) {
                exportedResults.value.authors = res.authors.filter(i => i.isExported)
            }
        }else{
            if(flag.tag) {
                validationResults.value = undefined
                exportedResults.value.tags = []
            }
            if(flag.topic) {
                exportedResults.value.topics = []
            }
            if(flag.author) {
                exportedResults.value.authors = []
            }
        }
    }

    watch(data, () => validationResults.value = undefined)

    return {validationResults, exportedResults}
}

function useDataHistory(tags: Ref<SimpleTag[]>, topics: Ref<SimpleTopic[]>, authors: Ref<SimpleAuthor[]>, data: Ref<Data>) {
    type Action = {action: "add"} | {action: "remove", index: number}
    type Record = Action & MetaTagTypeValue

    const undoStack = ref<Record[][]>([])
    const redoStack = ref<Record[][]>([])

    const canUndo = computed(() => !!undoStack.value.length)
    const canRedo = computed(() => !!redoStack.value.length)

    const undo = () => {
        if(canUndo.value) {
            const [records] = undoStack.value.splice(undoStack.value.length - 1, 1)
            for(const record of records.reverse()) {
                //对每组records，按反顺序撤销动作
                if(record.type === "tag") {
                    //撤销时执行相反的操作
                    if(record.action === "add") {
                        const i = tags.value.findIndex(i => i.id === record.value.id)
                        tags.value.splice(i, 1)
                    }else{
                        if(!tags.value.find(i => i.id === record.value.id)) {
                            tags.value.splice(record.index, 0, record.value)
                        }
                    }
                }else if(record.type === "topic") {
                    if(record.action === "add") {
                        const i = topics.value.findIndex(i => i.id === record.value.id)
                        topics.value.splice(i, 1)
                    }else{
                        if(!topics.value.find(i => i.id === record.value.id)) {
                            topics.value.splice(record.index, 0, record.value)
                        }
                    }
                }else if(record.type === "author") {
                    if(record.action === "add") {
                        const i = authors.value.findIndex(i => i.id === record.value.id)
                        authors.value.splice(i, 1)
                    }else{
                        if(!authors.value.find(i => i.id === record.value.id)) {
                            authors.value.splice(record.index, 0, record.value)
                        }
                    }
                }
            }

            redoStack.value.push(records)
        }
    }

    const redo = () => {
        if(canRedo.value) {
            const [records] = redoStack.value.splice(redoStack.value.length - 1, 1)
            for(const record of records) {
                if(record.type === "tag") {
                    //重做时执行相同的操作
                    if(record.action === "add") {
                        if(!tags.value.find(i => i.id === record.value.id)) {
                            tags.value.push(record.value)
                        }
                    }else{
                        const i = tags.value.findIndex(i => i.id === record.value.id)
                        tags.value.splice(i, 1)
                    }
                }else if(record.type === "topic") {
                    //重做时执行相同的操作
                    if(record.action === "add") {
                        if(!topics.value.find(i => i.id === record.value.id)) {
                            topics.value.push(record.value)
                        }
                    }else{
                        const i = topics.value.findIndex(i => i.id === record.value.id)
                        topics.value.splice(i, 1)
                    }
                }else if(record.type === "author") {
                    //重做时执行相同的操作
                    if(record.action === "add") {
                        if(!authors.value.find(i => i.id === record.value.id)) {
                            authors.value.push(record.value)
                        }
                    }else{
                        const i = authors.value.findIndex(i => i.id === record.value.id)
                        authors.value.splice(i, 1)
                    }
                }
            }

            undoStack.value.push(records)
        }
    }

    const addRecord = (record: Record | Record[]) => {
        if(record instanceof Array) {
            undoStack.value.push(record)
        }else{
            undoStack.value.push([record])
        }
        if(redoStack.value.length) {
            redoStack.value = []
        }
    }

    const getHistoryRecords = () => {
        return undoStack.value.flatMap(i => i).filter(i => i.action === "add").map(i => ({type: i.type, value: i.value} as MetaTagTypeValue))
    }

    watch(data, () => {
        //监听到data变化后就清除历史记录
        undoStack.value = []
        redoStack.value = []
    })

    return {canUndo, canRedo, undo, redo, addRecord, getHistoryRecords}
}

export function useRecentData() {
    const { identity } = useEditorContext()

    const fetchHistoryIdentities = useFetchHelper(client => client.metaUtil.history.identities.list)
    const fetchHistoryIdentitiesGet = useFetchHelper(client => client.metaUtil.history.identities.get)
    const fetchFrequent = useFetchHelper(client => client.metaUtil.history.metaTags.frequent)
    const fetchRecent = useFetchHelper(client => client.metaUtil.history.metaTags.recent)

    const selectList = ref([
        {label: "元数据标签使用历史", value: "recent"},
        {label: "经常使用的元数据标签", value: "frequent"}
    ])
    const selected = ref<"frequent" | "recent" | `${IdentityType}-${number}`>("recent")
    const selectedMetaTags = ref<MetaUtilResult>({authors: [], topics: [], tags: []})

    onBeforeMount(async () => {
        //查询identity编辑历史
        const res = await fetchHistoryIdentities({})
        if(res !== undefined) {
            const identityList = res
                .filter(({ type, id }) => !(type === identity.value?.type && id === identity.value?.id)) //从记录中过滤掉自己
                .map(({ type, id }) => ({label: `${type === "IMAGE" ? "图库项目" : type === "COLLECTION" ? "图库集合" : "画集"} ${id}`, value: `${type}-${id}`}))
            selectList.value.push(...identityList)
        }
    })

    watch(selected, async () => {
        if(selected.value === "frequent") {
            const res = await fetchFrequent({})
            if(res !== undefined) selectedMetaTags.value = res
            else selectedMetaTags.value = {authors: [], topics: [], tags: []}
        }else if(selected.value === "recent") {
            const res = await fetchRecent({})
            if(res !== undefined) selectedMetaTags.value = res
            else selectedMetaTags.value = {authors: [], topics: [], tags: []}
        }else{
            const [type, id] = selected.value.split("-", 2)
            const res = await fetchHistoryIdentitiesGet({type: type as IdentityType, id: parseInt(id)})
            if(res !== undefined) selectedMetaTags.value = res
            else selectedMetaTags.value = {authors: [], topics: [], tags: []}
        }
    }, {immediate: true})

    return {selectList, selected, selectedMetaTags}
}

export function useSuggestionData() {
    const { identity } = useEditorContext()

    const fetchSuggest = useFetchHelper(client => client.metaUtil.suggest)

    const selectList = ref<{label: string, value: string}[]>([])
    const suggestions = ref<{topics: SimpleTopic[], authors: SimpleAuthor[], tags: SimpleTag[]}[]>([])

    watch(identity, async (identity, old) => {
        if(identity !== null) {
            //确认首次执行，或identity实质未变
            if(old === undefined || !objects.deepEquals(identity, old)) {
                const res = await fetchSuggest(identity)
                if(res !== undefined) {
                    selectList.value = res.map(r => {
                        if(r.type === "children") return {label: "关联的子项目", value: "children"}
                        else if(r.type === "associate") return {label: "关联组的相关项目", value: "associate"}
                        else if(r.type === "collection") return {label: `所属的图库集合 ${r.collectionId}`, value: "collection"}
                        else if(r.type === "book") return {label: `所属画集《${r.book.title}》`, value: `book-${r.book.id}`}
                        else throw Error(`Unsupported suggestion ${r}.`)
                    })
                    suggestions.value = res.map(r => ({topics: r.topics, tags: r.tags, authors: r.authors}))
                    return
                }else{
                    selectList.value = []
                    suggestions.value = []
                }
            }
        }else{
            selectList.value = []
            suggestions.value = []
        }
    }, {immediate: true})

    return {selectList, suggestions}
}

export function useDatabaseData() {
    const { tabDBType } = useEditorContext()

    const authorSearchText = ref("")

    const topicSearchText = ref("")

    const { data: authorData, reset: authorReset, next: authorNext, loading: authorLoading } = useQueryContinuousListView({
        request: client => (offset, limit) => client.author.list({offset, limit, query: authorSearchText.value, order: "-updateTime"}),
        eventFilter: {
            filter: ["entity/meta-tag/created", "entity/meta-tag/updated", "entity/meta-tag/deleted"],
            operation({ event, reload, update, remove }) {
                if(event.eventType === "entity/meta-tag/created" && event.metaType === "AUTHOR") {
                    reload()
                }else if(event.eventType === "entity/meta-tag/updated" && event.metaType === "AUTHOR") {
                    update(i => i.id === event.metaId)
                }else if(event.eventType === "entity/meta-tag/deleted" && event.metaType === "AUTHOR") {
                    remove(i => i.id === event.metaId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.author.get(a.id))))
        },
        initSize: 40,
        continueSize: 20,
        autoInitialize: true
    })

    const { data: topicData, reset: topicReset, next: topicNext, loading: topicLoading } = useQueryContinuousListView({
        request: client => (offset, limit) => client.topic.list({offset, limit, query: topicSearchText.value, order: "-updateTime"}),
        eventFilter: {
            filter: ["entity/meta-tag/created", "entity/meta-tag/updated", "entity/meta-tag/deleted"],
            operation({ event, reload, update, remove }) {
                if(event.eventType === "entity/meta-tag/created" && event.metaType === "TOPIC") {
                    reload()
                }else if(event.eventType === "entity/meta-tag/updated" && event.metaType === "TOPIC") {
                    update(i => i.id === event.metaId)
                }else if(event.eventType === "entity/meta-tag/deleted" && event.metaType === "TOPIC") {
                    remove(i => i.id === event.metaId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.topic.get(a.id))))
        },
        initSize: 40,
        continueSize: 20,
        autoInitialize: true
    })

    const { data: tagData, refresh: tagRefresh } = useFetchReactive({
        get: client => () => client.tag.tree({}),
        eventFilter: e => (e.eventType === "entity/meta-tag/created" || e.eventType === "entity/meta-tag/updated" || e.eventType === "entity/meta-tag/deleted") && e.metaType === "TAG"
    })

    const tagSearch = useTagTreeSearch(tagData)

    const authorShowMore = computed(() => !authorLoading.value && authorData.value.total > authorData.value.result.length)

    const topicShowMore = computed(() => !topicLoading.value && topicData.value.total > topicData.value.result.length)

    watch(authorSearchText, authorReset)

    watch(topicSearchText, topicReset)

    const refresh = () => {
        if(tabDBType.value === "author") {
            authorReset()
        }else if(tabDBType.value === "topic") {
            topicReset()
        }else{
            tagRefresh()
        }
    }

    return {tabDBType, authorData, topicData, tagData, authorShowMore, topicShowMore, authorNext, topicNext, authorSearchText, topicSearchText, tagSearch, refresh}
}

export function useSourceDeriveData() {
    const toast = useToast()
    const message = useMessageBox()
    const { identity } = useEditorContext()

    const fetchSourceData = useFetchHelper({
        request: client => client.illust.image.sourceData.get,
        handleErrorInRequest: toast.handleException
    })

    const fetchSourceTagMappingQuery = useFetchHelper({
        request: client => client.sourceTagMapping.batchQuery,
        handleErrorInRequest: toast.handleException
    })

    const fetchSourceTagMappingUpdate = usePostPathFetchHelper({
        request: client => client.sourceTagMapping.update,
        handleErrorInRequest(e) {
            if(e.code === "NOT_EXIST") {
                if(e.info[0] === "site") {
                    message.showOkMessage("error", "选择的来源类型不存在。")
                }else{
                    message.showOkMessage("error", "选择的某项资源不存在。")
                }
            }else{
                toast.handleException(e)
            }
        },
        afterRequest() {
            if(identity.value !== null && identity.value.type === "IMAGE") {
                loadDerives().finally()
            }else{
                derives.value = []
            }
        }
    })

    const sourceSite = ref<string | null>(null)

    const derives = ref<BatchQueryResult[]>([])

    const loadDerives = async () => {
        const sourceDataRes = await fetchSourceData(identity.value!.id)
        if(sourceDataRes === undefined) {
            sourceSite.value = null
            derives.value = []
            return
        }
        if(sourceDataRes.sourceSite === null || !sourceDataRes.tags?.length) {
            sourceSite.value = null
            derives.value = []
            return
        }
        const res = await fetchSourceTagMappingQuery({site: sourceDataRes.sourceSite, tags: sourceDataRes.tags.map(i => i.code)})
        if(res === undefined) {
            derives.value = []
            return
        }
        sourceSite.value = sourceDataRes.sourceSite
        derives.value = sortDerives(res)
    }

    watch(identity, async (identity, old) => {
        if(identity !== null && identity.type === "IMAGE") {
            //确认首次执行，或identity实质未变
            if(old === undefined || !objects.deepEquals(identity, old)) {
                await loadDerives()
            }
        }else{
            derives.value = []
        }
    }, {immediate: true})

    const updateSourceTagMapping = (tagCode: string, items: SourceMappingTargetDetail[]) => {
        if(sourceSite.value !== null) {
            const itemIds = items.map(item => ({metaType: item.metaType, metaId: item.metaTag.id}))
            fetchSourceTagMappingUpdate({sourceSite: sourceSite.value, sourceTag: tagCode}, itemIds).finally()
        }
    }

    function sortDerives(sourceTags: BatchQueryResult[]): BatchQueryResult[] {
        //结果不采用默认的source tags顺序，而是按照mapping得到的meta tag类型和权重做排序。
        //对于每个sourceTag，使用它的映射结果中权重最高的项作为它的权重。
        //权重依据：type(author > topic > tag), id。
        return sourceTags
            .map(st => [st, getMaxTarget(st.mappings)] as const)
            .sort(([, a], [, b]) => compareMappingTarget(a, b))
            .map(([st,]) => st)
    }

    function getMaxTarget(targets: SourceMappingTargetDetail[]): SourceMappingTargetDetail | null {
        let max: SourceMappingTargetDetail | null = null
        for(const target of targets) {
            if(max === null || compareMappingTarget(target, max) < 0) {
                max = target
            }
        }
        return max
    }

    function compareMappingTarget(a: SourceMappingTargetDetail | null, b: SourceMappingTargetDetail | null): number {
        if(a !== null && b === null) return -1
        else if(a === null && b !== null) return 1
        else if(a === null && b === null) return 0
        else return a!.metaType !== b!.metaType ? compareMetaType(a!.metaType, b!.metaType) : compareNumber(a!.metaTag.id, b!.metaTag.id)
    }

    function compareMetaType(a: MetaType, b: MetaType): number {
        return compareNumber(META_TYPE_ORDINAL[a], META_TYPE_ORDINAL[b])
    }

    function compareNumber(a: number, b: number): number {
        return a < b ? -1 : a > b ? 1 : 0;
    }

    const META_TYPE_ORDINAL = {
        "AUTHOR": 1,
        "TOPIC": 2,
        "TAG": 3
    }

    return {sourceSite, derives, updateSourceTagMapping}
}
