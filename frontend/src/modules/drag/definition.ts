import { SimpleAuthor, SimpleTopic, SimpleTag } from "@/functions/http-client/api/all"
import { DraggingIllust } from "@/functions/http-client/api/illust"
import { ImportRecord } from "@/functions/http-client/api/import"
import { SimpleFolder } from "@/functions/http-client/api/folder"
import { Book } from "@/functions/http-client/api/book"

export interface TypeDefinition {
    tag: SimpleTag
    topic: SimpleTopic
    author: SimpleAuthor
    illusts: DraggingIllust[]
    importImages: ImportRecord[]
    books: Book[]
    folders: SimpleFolder[]
}
