import { useTabState } from "@/hooks/side-panel"

export function SidePanel() {
    const tabState = useTabState()

    return (
        <div>
            <p>{tabState.status}</p>
            <p>{tabState.url}</p>
        </div>
    )
}