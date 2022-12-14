import { SimpleAuthor, SimpleTopic, SimpleTag } from "@/functions/http-client/api/all"
import { SimpleAnnotation } from "@/functions/http-client/api/annotations"
import { CoverIllust } from "@/functions/http-client/api/illust"
import { ImportImage } from "@/functions/http-client/api/import"

export interface TypeDefinition {
    tag: SimpleTag
    topic: SimpleTopic
    author: SimpleAuthor
    annotation: SimpleAnnotation
    illusts: CoverIllust[]
    importImages: ImportImage[]
}
