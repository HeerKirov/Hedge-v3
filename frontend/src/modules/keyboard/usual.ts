import { createKeyEventValidator, createPrimitiveKeyEventValidator } from "@/modules/keyboard/event"

export const USUAL_KEY_VALIDATORS = {
    "Enter": createKeyEventValidator("Enter"),
    "Space": createKeyEventValidator("Space"),
    "Escape": createKeyEventValidator("Escape"),
    "Backspace": createKeyEventValidator("Backspace"),
    "ArrowUp": createKeyEventValidator("ArrowUp"),
    "ArrowDown": createKeyEventValidator("ArrowDown"),
    "ArrowLeft": createKeyEventValidator("ArrowLeft"),
    "ArrowRight": createKeyEventValidator("ArrowRight"),
    "Arrows": createKeyEventValidator(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]),
}

export const USUAL_PRIMITIVE_KEY_VALIDATORS = {
    "Enter": createPrimitiveKeyEventValidator("Enter"),
    "Space": createPrimitiveKeyEventValidator("Space"),
    "Escape": createPrimitiveKeyEventValidator("Escape"),
    "Backspace": createPrimitiveKeyEventValidator("Backspace"),
    "ArrowUp": createPrimitiveKeyEventValidator("ArrowUp"),
    "ArrowDown": createPrimitiveKeyEventValidator("ArrowDown"),
    "ArrowLeft": createPrimitiveKeyEventValidator("ArrowLeft"),
    "ArrowRight": createPrimitiveKeyEventValidator("ArrowRight"),
    "Arrows": createPrimitiveKeyEventValidator(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]),
}
