import { SourceTagForm } from "@/functions/server/api-source-data"
import { FANTIA_CONSTANTS } from "@/functions/sites"
import { Result } from "@/utils/primitives"

export function analyseArtistFromDOM(document: Document): Result<SourceTagForm, string> {
    //查找作者，作为tag写入。作者的type固定为"artist"，code为"{UID}"
    const artistAnchor = document.querySelector<HTMLAnchorElement>("h1.fanclub-name a")
    if(artistAnchor !== null) {
        const matcher = artistAnchor.textContent!.match(/^(?<CLUB>.*)\((?<NAME>.*)\)$/)
        if(!matcher || !matcher.groups) {
            return {ok: false, err: `Artist: Cannot analyse artist anchor title.`}
        }
        const name = matcher.groups["NAME"]
        const club = matcher.groups["CLUB"]
        const url = new URL(artistAnchor.href)
        const match = url.pathname.match(FANTIA_CONSTANTS.REGEXES.USER_PATHNAME)
        if(!match || !match.groups) {
            return {ok: false, err: `Artist: cannot analyse artist anchor href.`}
        }
        const userId = match.groups["UID"]
        return {ok: true, value: {code: userId, name: name, otherName: club, type: "artist"}}
    }else{
        return {ok: false, err: `Artist: cannot find artist section.`}
    }
}