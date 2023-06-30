import { markRaw } from "vue"
import { HttpClient, mapResponse } from "@/functions/http-client"
import { useFetchHelper } from "@/functions/fetch"
import { installation } from "@/utils/reactivity"
import { AttachTemplate, TemplateOption } from "./template"

export function parseOrder(order: string): [string, "ascending" | "descending"] {
    if(order.startsWith("+")) {
        return [order.slice(1), "ascending"]
    }else if(order.startsWith("-")) {
        return [order.slice(1), "descending"]
    }else{
        return [order, "ascending"]
    }
}

export function generateOrder(orderValue: string, direction: "ascending" | "descending"): string {
    return `${direction === "ascending" ? "+" : "-"}${orderValue}`
}

export interface SearchOptionCacheStorage {
    readonly [field: string]: FieldCacheStorage
}

interface FieldCacheStorage {
    get(value: any): Promise<TemplateOption>
    update(option: TemplateOption): void
}

export const [installOptionCacheStorage, useOptionCacheStorage] = installation(function (templates: AttachTemplate[]): SearchOptionCacheStorage {
        const fields: {[field: string]: FieldCacheStorage} = {}

        for(const template of templates) {
            if(template.type === "search") {
                const cache = new Map<any, TemplateOption>()

                const queryOne = template.queryOne && useFetchHelper({
                    request: template.mapQueryOne ? (client: HttpClient) => {
                        const method = template.queryOne!(client)
                        return async (value: any) => mapResponse(await method(value), template.mapQueryOne!)
                    } : template.queryOne,
                    handleErrorInRequest(e) {
                        if(e.code !== "NOT_FOUND") {
                            //忽略NOT FOUND错误，使其仅返回空值
                            return e
                        }
                    }
                })

                fields[template.field] = {
                    async get(value: any): Promise<TemplateOption> {
                        const option = cache.get(value)
                        if(option !== undefined) {
                            return option
                        }else if(queryOne) {
                            const res = await queryOne(value) as TemplateOption | undefined
                            if(res !== undefined) {
                                cache.set(res.value, res)
                                return res
                            }
                        }
                        return {value, label: `${value}`}
                    },
                    update(option: TemplateOption) {
                        cache.set(option.value, option)
                    }
                }
            }
        }

        return markRaw(fields)
    }
)
