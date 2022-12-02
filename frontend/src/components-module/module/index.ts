import MessageBox from "./MessageBox/MessageBox.vue"
import Toast from "./Toast/Toast.vue"

//TODO 由于electron的不明bug，需要写一个PopupMenu模块取代native popupMenu。

export {
    MessageBox as MessageBoxModule,
    Toast as ToastModule
}
