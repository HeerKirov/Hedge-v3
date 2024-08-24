import React from "react"
import ReactDOM from "react-dom/client"
import { Options } from "@/views/options/Options"
import { GlobalStyle } from "@/styles"

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <GlobalStyle/>
        <Options/>
    </React.StrictMode>
)
