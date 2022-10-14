export { analyseKeyPress } from "./definition"
export type { KeyPress, KeyCode } from "./definition"
export type { KeyEvent } from "./event"
export { USUAL_KEY_VALIDATORS, USUAL_PRIMITIVE_KEY_VALIDATORS } from "./usual"
export { onKey, onKeyEnter, checkKeyEvent, checkPrimitiveKeyEvent, createKeyEventValidator, createPrimitiveKeyEventValidator, toKeyEvent } from "./event"
export { installGlobalKeyManager, useGlobalKey, useInterceptedKey, useInterception, useKeyDeclaration, installKeyDeclaration } from "./global"

/*
 * == Keyboard Event模块 ==
 * 整个App中的任何keyboard按键响应都通过此模块处理。主要包括两种途径：全局注册的快捷键；在组件上注册的响应事件。
 * 此模块主要做了以下工作：
 * - 将所有快捷键描述统一化，并消除平台差异，不再需要在各个地方反复处理各个平台的不同快捷键。
 * - 使全局快捷键可挂载、有序化，使用栈模式管理，优先响应最新挂载的快捷键，这样便可分层拦截快捷键，达成最符合直觉的响应机制。
 * - 任何具有按键响应的组件也都通过此模块实现。它们总是默认拦截所有事件的外溢，只通过event暴露KeyEvent，或者与此模块结合来外溢需要的事件。
 */
