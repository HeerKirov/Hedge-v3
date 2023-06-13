import { ref, Ref, unref } from "vue"
import { BasicException } from "@/functions/http-client/exceptions"
import { HttpClient, Response } from "@/functions/http-client"
import { useFetchManager } from "./install"

interface CreatingHelper<FORM> {
    creating: Readonly<Ref<boolean>>
    submit(): Promise<boolean>
}

interface CreatingHelperOptions<FORM, OUTPUT, RESULT, CE extends BasicException> {
    form: Ref<FORM>,
    mapForm(form: FORM): OUTPUT
    create(httpClient: HttpClient): (form: OUTPUT) => Promise<Response<RESULT, CE>>
    beforeCreate?(form: FORM): boolean | void
    afterCreate?(result: RESULT): void
    handleError?: ErrorHandler<CE>
}

interface ErrorHandler<E extends BasicException> {
    (e: E): E | void
}

export function useCreatingHelper<FORM, OUTPUT, RESULT, CE extends BasicException>(options: CreatingHelperOptions<FORM, OUTPUT, RESULT, CE>): CreatingHelper<FORM> {
    const { httpClient, handleException } = useFetchManager()

    const method = options.create(httpClient)

    const creating = ref(false)

    const submit = async (): Promise<boolean> => {
        if(!creating.value) {
            creating.value = true
            try {
                const form = unref(options.form.value)
                const validated = options.beforeCreate ? (options.beforeCreate(form) ?? true) : true
                if(!validated) {
                    return false
                }
                const res = await method(options.mapForm(form))
                if(res.ok) {
                    options.afterCreate?.(res.data)
                }else{
                    //首先尝试让上层处理错误，上层拒绝处理则自行处理
                    const e = options.handleError ? options.handleError(res.exception) : res.exception
                    if(e != undefined) handleException(e)
                    return false
                }
            }finally{
                creating.value = false
            }
            return true
        }
        return false
    }

    return {creating, submit}
}
