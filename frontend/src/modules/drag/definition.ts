import { SimpleAuthor, SimpleTopic, SimpleTag } from "@/functions/http-client/api/all"
import { SimpleAnnotation } from "@/functions/http-client/api/annotations"
import { CoverIllust } from "@/functions/http-client/api/illust"
import { ImportImage } from "@/functions/http-client/api/import"
import { SimpleFolder } from "@/functions/http-client/api/folder"
import { Book } from "@/functions/http-client/api/book"

export interface TypeDefinition {
    tag: SimpleTag
    topic: SimpleTopic
    author: SimpleAuthor
    annotation: SimpleAnnotation
    illusts: CoverIllust[]
    importImages: ImportImage[]
    books: Book[]
    folder: SimpleFolder
}
