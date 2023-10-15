import { LocalDateTime, datetime } from "@/utils/datetime"
import { HttpInstance, Response } from ".."
import { NotFound } from "../exceptions"
import { IdResponse, LimitAndOffsetFilter, ListResult, OrderList } from "./all"

export function createNoteEndpoint(http: HttpInstance): NoteEndpoint {
    return {
        list: http.createQueryRequest("/api/notes", "GET", {
            parseResponse: ({ total, result }: ListResult<any>) => ({total, result: result.map(mapToNoteRecord)})
        }),
        create: http.createDataRequest("/api/notes", "POST"),
        get: http.createPathRequest(id => `/api/notes/${id}`, "GET", {
            parseResponse: mapToNoteRecord
        }),
        update: http.createPathDataRequest(id => `/api/notes/${id}`, "PATCH"),
        delete: http.createPathRequest(id => `/api/notes/${id}`, "DELETE")
    }
}

function mapToNoteRecord(data: any): NoteRecord {
    return {
        id: <number>data["id"],
        title: <string>data["title"],
        content: <string>data["content"],
        status: <NoteStatus>data["status"],
        deleted: <boolean>data["deleted"],
        createTime: datetime.of(<string>data["createTime"]),
        updateTime: datetime.of(<string>data["updateTime"])
    }
}

export interface NoteEndpoint {
    /**
     * 查询便签列表。
     */
    list(filter: NoteFilter): Promise<Response<ListResult<NoteRecord>>>
    /**
     * 新建便签。
     */
    create(form: NoteCreateForm): Promise<Response<IdResponse>>
    /**
     * 查看便签。
     */
    get(id: number): Promise<Response<NoteRecord, NotFound>>
    /**
     * 修改便签。
     */
    update(id: number, form: NoteUpdateForm): Promise<Response<null, NotFound>>
    /**
     * 删除便签。
     */
    delete(id: number): Promise<Response<null, NotFound>>
}

export type NoteStatus = "PINNED" | "TODO" | "COMPLETED"

export interface NoteRecord {
    id: number
    title: string
    content: string
    status: NoteStatus
    deleted: boolean
    createTime: LocalDateTime
    updateTime: LocalDateTime
}

export interface NoteCreateForm {
    title: string
    content: string
    status?: NoteStatus
}

export type NoteUpdateForm = Partial<NoteCreateForm> & { deleted?: boolean }

export type NoteFilter = NoteQueryFilter & LimitAndOffsetFilter

export interface NoteQueryFilter {
    status?: NoteStatus[]
    deleted?: boolean
    order?: OrderList<"status" | "createTime" | "updateTime">
}