import { onDOMContentLoaded } from "@/utils/document"
import { settings } from "@/functions/setting"

onDOMContentLoaded(async () => {
    const setting = await settings.get()
    if(setting.toolkit.determiningFilename.referrerPolicy) {
        console.log("[Hedge v3 Helper] referrer-policy script loaded.")

        const meta = document.createElement("meta")
        meta.name = "referrer"
        meta.content = "unsafe-url"
        document.head.appendChild(meta)
    }
})