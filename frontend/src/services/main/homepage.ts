import { useFetchReactive } from "@/functions/fetch"

export function useHomepageContext() {
    const { data, loading } = useFetchReactive({
        get: client => client.homepage.homepage
    })

    return {data, loading}
}