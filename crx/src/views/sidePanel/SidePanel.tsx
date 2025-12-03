import { useTabState } from "@/hooks/tabs"

export function SidePanel() {
    const tabState = useTabState()

    return (
        <div>
            <p>{tabState.status}</p>
            <p>{tabState.url}</p>
        </div>
    )
}