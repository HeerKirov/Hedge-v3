/**
 * 判断此年是否是闰年。
 * @param year 年份
 */
function isLeapYear(year: number): boolean {
    return !(year % (year % 100 ? 4 : 400))
}

/**
 * 获得此月份的天数。
 * @param year 年
 * @param month 月
 */
export function getDaysOfMonth(year: number, month: number): number {
    return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] + (month === 2 && (isLeapYear(year)) ? 1 : 0)
}

/**
 * 标准化的当地日期。
 */
export interface LocalDate {
    /**
     * 年份。
     */
    readonly year: number
    /**
     * 月份，取值1~12。
     */
    readonly month: number
    /**
     * 日。取值1~31。
     */
    readonly day: number
    /**
     * 每周中的日。取值0~6，代表周日到周六。
     */
    readonly dayInWeek: number
    /**
     * 此时间的UTC时间戳。
     */
    readonly timestamp: number
}

/**
 * 标准化的当地时间。时区总是取本机时间。
 */
export interface LocalDateTime extends LocalDate {
    /**
     * 小时。取值0~23。
     */
    readonly hours: number
    /**
     * 分钟，取值0~59。
     */
    readonly minutes: number
    /**
     * 秒。取值0~59。
     */
    readonly seconds: number
}

export const date = {
    /**
     * 获得当前日期。
     */
    now(): LocalDate {
        return nativeDateToDate(new Date())
    },
    /**
     * 将一个UTC时间戳转换为LocalDate。字符串时间戳必须符合yyyy-MM-dd的格式。
     */
    of(time: string): LocalDate {
        const match0 = /^(\d+)-(\d+)-(\d+)$/.exec(time)
        if(match0) {
            const year = parseInt(match0[1]), month = parseInt(match0[2]), day = parseInt(match0[3])
            return toDate(year, month, day)
        }
        const match1 = /^(\d+)-(\d+)-(\d+)T\d+:\d+:\d+Z$/.exec(time)
        if(match1) {
            const year = parseInt(match1[1]), month = parseInt(match1[2]), day = parseInt(match1[3])
            return toDate(year, month, day)
        }
        throw new Error(`dateOf can only accept time with format 'yyyy-MM-ddTHH:mm:ssZ' or 'yyyy-MM-dd', but actual is ${time}.`)
    },
    /**
     * 将年月日转换为LocalDate。
     */
    ofDate(year: number, month: number, day: number): LocalDate {
        return toDate(year, month, day)
    },
    /**
     * 转换为yyyy-MM-dd的标准时间戳。
     */
    toISOString({ year, month, day }: LocalDate): string {
        return `${year}-${ten(month)}-${ten(day)}`
    },
    /**
     * 替换year并生成新的时间。
     * 如果因年份变化引起日期变化(从闰年变到非闰年导致2月29日消失)，那么会缩减到本月最后一天。
     */
    withYear(date: LocalDate, year: number): LocalDate {
        if(year === date.year) return date

        const maxDay = getDaysOfMonth(year, date.month)
        const d = toNativeDate({...date, year, day: date.day > maxDay ? maxDay : date.day, hours: 0, minutes: 0, seconds: 0})

        return nativeDateToDate(d)
    },
    /**
     * 替换month并生成新的时间。
     * 如果因月份变化引起日期变化，那么会缩减到本月最后一天。
     */
    withMonth(date: LocalDate, month: number): LocalDate {
        if(month === date.month) return date

        const maxDay = getDaysOfMonth(date.year, month)
        const d = toNativeDate({...date, month, day: date.day > maxDay ? maxDay : date.day, hours: 0, minutes: 0, seconds: 0})

        return nativeDateToDate(d)
    },
    /**
     * 替换day并生成新的时间。
     */
    withDay(date: LocalDate, day: number): LocalDate {
        if(day === date.day) return date
        const d = toNativeDate({...date, day, hours: 0, minutes: 0, seconds: 0})
        return nativeDateToDate(d)
    },
}

export const datetime = {
    /**
     * 获得当前时间。
     */
    now(): LocalDateTime {
        return nativeDateToDateTime(new Date())
    },
    /**
     * 将一个UTC时间戳转换为LocalDateTime。字符串时间戳必须符合yyyy-MM-ddTHH:mm:ssZ的格式。
     */
    of(time: string | number): LocalDateTime {
        if(typeof time === "number") {
            const d = new Date(time)
            return nativeDateToDateTime(d)
        }else{
            const match = /^\d+-\d+-\d+T\d+:\d+:\d+(\.\d+)?Z$/.exec(time)
            if (match) {
                const d = new Date(time)
                return nativeDateToDateTime(d)
            }
            throw new Error(`datetimeOf can only accept time with format 'yyyy-MM-ddTHH:mm:ss[.SSS]Z', but actual is ${time}.`)
        }
    },
    /**
     * 转换为yyyy-MM-dd`T`HH:mm:ss`Z`(UTC)的标准时间戳。
     */
    toISOString({ timestamp }: LocalDateTime): string {
        const d = new Date(timestamp)
        return `${d.getUTCFullYear()}-${ten(d.getUTCMonth() + 1)}-${ten(d.getUTCDate())}T${ten(d.getUTCHours())}:${ten(d.getUTCMinutes())}:${ten(d.getUTCSeconds())}Z`
    },
    /**
     * 转换为yyyy-MM-dd HH:mm:ss的字符串格式。
     */
    toSimpleFormat({ year, month, day, hours, minutes, seconds }: LocalDateTime): string {
        return `${year}-${ten(month)}-${ten(day)} ${ten(hours)}:${ten(minutes)}:${ten(seconds)}`
    },
    /**
     * 替换year并生成新的时间。
     * 如果因年份变化引起日期变化(从闰年变到非闰年导致2月29日消失)，那么会缩减到本月最后一天。
     */
    withYear(dateTime: LocalDateTime, year: number): LocalDateTime {
        if(year === dateTime.year) return dateTime

        const maxDay = getDaysOfMonth(year, dateTime.month)
        const d = toNativeDate({...dateTime, year, day: dateTime.day > maxDay ? maxDay : dateTime.day})

        return nativeDateToDateTime(d)
    },
    /**
     * 替换month并生成新的时间。
     * 如果因月份变化引起日期变化，那么会缩减到本月最后一天。
     */
    withMonth(dateTime: LocalDateTime, month: number): LocalDateTime {
        if(month === dateTime.month) return dateTime

        const maxDay = getDaysOfMonth(dateTime.year, month)
        const d = toNativeDate({...dateTime, month, day: dateTime.day > maxDay ? maxDay : dateTime.day})

        return nativeDateToDateTime(d)
    },
    /**
     * 替换day并生成新的时间。
     */
    withDay(dateTime: LocalDateTime, day: number): LocalDateTime {
        if(day === dateTime.day) return dateTime
        const d = toNativeDate({...dateTime, day})
        return nativeDateToDateTime(d)
    },
    /**
     * 替换hour并生成新的时间。
     */
    withHour(dateTime: LocalDateTime, hours: number): LocalDateTime {
        if(hours === dateTime.hours) return dateTime
        const d = toNativeDate({...dateTime, hours})
        return nativeDateToDateTime(d)
    },
    /**
     * 替换minute并生成新的时间。
     */
    withMinute(dateTime: LocalDateTime, minutes: number): LocalDateTime {
        if(minutes === dateTime.minutes) return dateTime
        const d = toNativeDate({...dateTime, minutes})
        return nativeDateToDateTime(d)
    },
    /**
     * 替换day并生成新的时间。
     */
    withSecond(dateTime: LocalDateTime, seconds: number): LocalDateTime {
        if(seconds === dateTime.seconds) return dateTime
        const d = toNativeDate({...dateTime, seconds})
        return nativeDateToDateTime(d)
    }
}

/**
 * 构造LocalDate。
 */
function toDate(year: number, month: number, day: number): LocalDate {
    const d = new Date(year, month - 1, day)
    return {year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), dayInWeek: d.getDay(), timestamp: d.getTime()}
}

/**
 * 构造LocalDateTime。
 */
function nativeDateToDate(date: Date): LocalDate {
    return {year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), dayInWeek: date.getDay(), timestamp: date.getTime()}
}

/**
 * 构造LocalDateTime。
 */
function nativeDateToDateTime(date: Date): LocalDateTime {
    return {year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), dayInWeek: date.getDay(), hours: date.getHours(), minutes: date.getMinutes(), seconds: date.getSeconds(), timestamp: date.getTime()}
}

function toNativeDate({ year, month, day, hours, minutes, seconds }: {year: number, month: number, day: number, hours: number, minutes: number, seconds: number}): Date {
    return new Date(year, month - 1, day, hours, minutes, seconds)
}

/**
 * 如果数字只有1位，填补0；否则原样输出。
 */
function ten(i: number): string | number {
    return i >= 10 ? i : `0${i}`
}
