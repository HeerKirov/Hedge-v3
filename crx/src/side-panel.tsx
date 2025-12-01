import React from "react"
import ReactDOM from "react-dom/client"
import { SidePanel } from "@/views/sidePanel/SidePanel"
import { GlobalStyle } from "./styles"

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <GlobalStyle/>
        <SidePanel/>
    </React.StrictMode>
)
