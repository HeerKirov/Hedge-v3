import { ComponentPublicInstance, ref, Ref } from "vue"
import { useFetchHelper } from "@/functions/fetch"
import { Dialect, VisualForecast } from "@/functions/http-client/api/util-query"

export function useForecast(inputRef: Ref<ComponentPublicInstance | undefined>, textValue: Ref<string | undefined>, dialect: Dialect | undefined) {
    let timer: NodeJS.Timeout | null = null

    const fetch = useFetchHelper(client => client.queryUtil.queryForecast)

    const forecast = ref<VisualForecast | null>(null)

    async function trigger() {
        if(inputRef.value?.$el) {
            const input = inputRef.value.$el as HTMLInputElement
            const res = await fetch({dialect: dialect!, text: input.value, cursorIndex: input.selectionStart})
            if(res?.succeed && res.forecast.suggestions.length) {
                forecast.value = res.forecast
            }
        }
    }

    function startForecastTimer() {
        if(dialect !== undefined) {
            if(timer !== null) clearTimeout(timer)
            timer = setTimeout(trigger, 200)
        }
        if(forecast.value !== null) forecast.value = null
    }

    function stopForecastTimer() {
        if(dialect !== undefined && timer !== null) {
            clearTimeout(timer)
            timer = null
        }
        if(forecast.value !== null) forecast.value = null
    }

    function pickSuggestion(item: VisualForecast["suggestions"][number]) {
        if(inputRef.value?.$el && forecast.value) {
            const input = inputRef.value.$el as HTMLInputElement
            const replaced = forecast.value.type === "source-tag" || forecast.value.type === "tag" || forecast.value.type === "topic"  || forecast.value.type === "author" ? "`" + item.name + "`" : item.name
            const newValue = input.value.substring(0, forecast.value.beginIndex) + replaced + input.value.substring(forecast.value.endIndex)
            input.value = newValue
            textValue.value = newValue
            input.selectionStart = input.selectionEnd = forecast.value.beginIndex + item.name.length
            forecast.value = null
        }
    }

    return {startForecastTimer, stopForecastTimer, forecast, pickSuggestion}
}