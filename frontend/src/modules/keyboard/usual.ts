import { createKeyEventValidator, createPrimitiveKeyEventValidator } from "@/modules/keyboard/event"

export const USUAL_KEY_VALIDATORS = {
    "Enter": createKeyEventValidator("Enter"),
    "ArrowUp": createKeyEventValidator("ArrowUp"),
    "ArrowDown": createKeyEventValidator("ArrowDown"),
    "ArrowLeft": createKeyEventValidator("ArrowLeft"),
    "ArrowRight": createKeyEventValidator("ArrowRight"),
}

export const USUAL_PRIMITIVE_KEY_VALIDATORS = {
    "Enter": createPrimitiveKeyEventValidator("Enter"),
    "ArrowUp": createPrimitiveKeyEventValidator("ArrowUp"),
    "ArrowDown": createPrimitiveKeyEventValidator("ArrowDown"),
    "ArrowLeft": createPrimitiveKeyEventValidator("ArrowLeft"),
    "ArrowRight": createPrimitiveKeyEventValidator("ArrowRight"),
}
