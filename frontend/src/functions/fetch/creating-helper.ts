import { ref, Ref, unref, watch } from "vue"
import { BasicException } from "@/functions/http-client/exceptions"
import { HttpClient, Response } from "@/functions/http-client"
import { useFetchManager } from "./install"
import { objects } from "@/utils/primitives"

interface CreatingHelper<FORM> {
    creating: Readonly<Ref<boolean>>
    submit(): Promise<boolean>
}

interface CreatingHelperOptions<FORM extends object, OUTPUT extends object, RESULT, CE extends BasicException> {
    form: Ref<FORM>,
    mapForm(form: FORM): OUTPUT
    create(httpClient: HttpClient): (form: OUTPUT) => Promise<Response<RESULT, CE>>
    beforeCreate?(form: FORM): boolean | void
    afterCreate?(result: RESULT): void
    handleError?: ErrorHandler<CE>
    validate?: {
        fields: (keyof FORM)[]
        beforeValidate?(form: FORM): boolean | void
        handleError?: ErrorHandler<CE>
    }
}

interface ErrorHandler<E extends BasicException> {
    (e: E): E | void
}

export function useCreatingHelper<FORM extends object, OUTPUT extends object, RESULT, CE extends BasicException>(options: CreatingHelperOptions<FORM, OUTPUT, RESULT, CE>): CreatingHelper<FORM> {
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

    if(options.validate) {
        watch(() => options.validate!.fields.map(key => options.form.value[key]), async () => {
            const validated = options.validate!.beforeValidate ? (options.validate!.beforeValidate(options.form.value) ?? true) : true
            if(!validated) {
                return
            }
            const res = await method({...options.mapForm(options.form.value), dryRun: true})
            if(!res.ok) {
                //首先尝试让上层处理错误，上层拒绝处理则自行处理
                const e = options.validate!.handleError ? options.validate!.handleError(res.exception) : options.handleError ? options.handleError(res.exception) : res.exception
                if(e != undefined) handleException(e)
            }
        })
    }

    return {creating, submit}
}
