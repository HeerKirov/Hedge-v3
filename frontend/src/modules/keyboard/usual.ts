import { createKeyEventValidator, KeyEvent } from "@/modules/keyboard/event"

export const USUAL_KEY_VALIDATORS = {
    "Enter": createKeyEventValidator("Enter"),
    "ArrowUp": createKeyEventValidator("ArrowUp"),
    "ArrowDown": createKeyEventValidator("ArrowDown"),
    "ArrowLeft": createKeyEventValidator("ArrowLeft"),
    "ArrowRight": createKeyEventValidator("ArrowRight"),
}
