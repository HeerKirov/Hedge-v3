import { settings } from "@/functions/setting"
import { receiveMessage } from "@/services/messages"
import { determiningFilename } from "@/services/downloads"
import { notificationButtonClicked } from "@/services/notification"

chrome.storage.session.setAccessLevel({accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS"}).finally()

chrome.runtime.onMessage.addListener(receiveMessage)

chrome.notifications.onButtonClicked.addListener(notificationButtonClicked)

chrome.downloads.onDeterminingFilename.addListener(determiningFilename)

settings.load().finally()
