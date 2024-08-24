import React from "react"
import ReactDOM from "react-dom/client"
import { Popup } from "@/views/popup/Popup"
import { GlobalStyle } from "./styles"

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <GlobalStyle/>
        <Popup/>
    </React.StrictMode>
)
