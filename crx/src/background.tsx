import { initialize } from "@/functions/setting"
import { receiveMessage } from "@/services/messages"
import { determiningFilename } from "@/services/downloads"
import { notificationButtonClicked } from "@/services/notification"
import { contextMenuClicked, globalContextMenu } from "@/services/context-menu"

chrome.storage.session.setAccessLevel({accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS"}).finally()

chrome.runtime.onInstalled.addListener(initialize)

chrome.runtime.onMessage.addListener(receiveMessage)

chrome.notifications.onButtonClicked.addListener(notificationButtonClicked)

chrome.downloads.onDeterminingFilename.addListener(determiningFilename)

chrome.contextMenus.onClicked.addListener(contextMenuClicked)

globalContextMenu.forEach(contextMenu => chrome.contextMenus.create(contextMenu))
