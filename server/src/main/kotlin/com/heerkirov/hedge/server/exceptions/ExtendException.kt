package com.heerkirov.hedge.server.exceptions

import com.heerkirov.hedge.server.enums.ExportType
import com.heerkirov.hedge.server.utils.tuples.Tuple3
import com.heerkirov.hedge.server.utils.tuples.t3

/**
 * 当尝试对内建内容进行写操作时，抛出此异常。
 * 抛出位置：
 * - site add/update/delete的对象是内建内容时
 */
class BuiltinNotWritableError(objectName: String) : BadRequestException<String>("BUILTIN_NOT_WRITABLE", "Builtin object '$objectName' is not writable.", objectName)

/**
 * 当指定导入的文件不可访问时，抛出此异常。
 * 抛出位置：
 * - import从本地导入
 */
class FileNotFoundError : BadRequestException<Nothing?>("FILE_NOT_FOUND", "Target file is not found or not accessible.", null)

/**
 * 当指定的目录不存在或不可访问时，抛出此异常。
 * 抛出位置：
 * - export导出时
 */
class LocationNotAccessibleError : BadRequestException<Nothing?>("LOCATION_NOT_ACCESSIBLE", "Target location is not found or not accessible.", null)

/**
 * 当指定的文件已存在时，抛出此异常。
 * 抛出位置：
 * - export导出时
 */
class FileAlreadyExistsError(file: String) : BadRequestException<String?>("FILE_ALREADY_EXISTS", "Target file '$file' is already exists.", file)

/**
 * 当指定的文件的扩展名不受支持时，抛出此异常。
 * 抛出位置：
 * - upload/import导入时
 * - source upload/import导入时
 * info: string: 扩展名
 */
class IllegalFileExtensionError(extension: String) : BadRequestException<String>("ILLEGAL_FILE_EXTENSION", "Extension type '$extension' is illegal.", extension)

/**
 * 当存储目录不可用时，抛出此异常。此类异常通常抛于当需要对存储进行写入时。读取则并不一定。
 * 抛出位置:
 * - upload/import导入时
 * info: string: 存储路径
 */
class StorageNotAccessibleError(storageDir: String) : BadRequestException<String>("STORAGE_NOT_ACCESSIBLE", "Storage dir '$storageDir' is not accessible.", storageDir)

/**
 * 当parentId出现闭环时，抛出此异常。parentId为自己时也构成闭环。
 * 抛出位置：
 * - 更新tag的parentId
 * - 更新topic的parentId
 */
class RecursiveParentError : BadRequestException<Nothing?>("RECURSIVE_PARENT", "Param 'parentId' has recursive.", null)

/**
 * 当将color赋值给一个非根的tag时，抛出此异常。
 * 抛出位置：
 * - 设定tag的color
 * info: string: 扩展名
 */
class CannotGiveColorError : BadRequestException<Nothing?>("CANNOT_GIVE_COLOR", "Cannot give 'color' for a not root tag.", null)

/**
 * 当参数的值违反其他关系带来的约束时，抛出此异常。
 * 抛出位置：
 * - 设定topic的type，且type与parent不适用时
 * - 更新topic的type，且type与任意children不适用时
 * info: (string, string, V[]): 发生问题的参数名称, 发生冲突的约束参数名称, 不满足此约束的约束对象
 */
class IllegalConstraintError<V>(paramName: String, relation: String, relationValue: Collection<V>) : BadRequestException<Tuple3<String, String, Collection<V>>>("ILLEGAL_CONSTRAINT", "Param '$paramName' is illegal for constraint of $relation with $paramName $relationValue.", t3(paramName, relation, relationValue))

/**
 * 当给出的tag组中，直接存在或间接导出了具有强制属性的同一冲突组下的至少两个成员时，抛出此异常。
 * 抛出位置：
 * - 设定illust的tags时
 *
 * info: ConflictingMembers[]: 发生冲突的组(包括它下属的冲突成员)
 *
 * @param conflictingMembers 发生冲突的组成员。外层Map指代组，内层List指代同一个组下冲突的组员。
 */
class ConflictingGroupMembersError(conflictingMembers: List<ConflictingMembers>) : BadRequestException<List<ConflictingGroupMembersError.ConflictingMembers>>(
    "CONFLICTING_GROUP_MEMBERS",
    "Tags ${conflictingMembers.joinToString { (groupId, _, members) -> "$groupId: [${members.joinToString { "${it.name}(${it.id})" }}]" }} are in same conflicting group.",
    conflictingMembers) {

    data class ConflictingMembers(val group: Member, val force: Boolean, val members: List<Member>)
    data class Member(val id: Int, val name: String, val color: String?, val isExported: ExportType)
}

/**
 * 当regex表达式解析出现错误，且引起错误的原因大概率是编写的错误时，抛出此异常。
 * 抛出位置：
 * - 导入新的项目，且开启自动source meta解析时
 * - 调用source meta解析工具时
 *
 * info: string: regex内容
 */
class InvalidRegexError(regex: String, msg: String): BadRequestException<String>("INVALID_REGEX", "Regex $regex may has some error because an exception was thrown: $msg", regex)

/**
 * 当编写的rule的index与site的规则不匹配时，抛出此异常。
 * 指partGroup、partNameGroup、extras等与site的规则要求相反时的情况。
 * 抛出位置：
 * - 更新import rule列表时
 *
 * info: (string, string, string): site名称, regex内容, 字段名
 */
class InvalidRuleIndexError(site: String, regex: String, field: String) : BadRequestException<Tuple3<String, String, String>>("INVALID_RULE_INDEX", "Rule [$site] '$regex': $field config which not suit to site config.", t3(site, regex, field))

/**
 * 当给出的颜色值不符合要求时，抛出此异常。
 * 抛出位置：
 * - 设置meta setting时
 * - 设置tag的color属性时
 *
 * info: string: 错误的颜色名称
 */
class InvalidColorError(color: String) : BadRequestException<String>("INVALID_COLOR", "'$color' is not a valid color.", color)