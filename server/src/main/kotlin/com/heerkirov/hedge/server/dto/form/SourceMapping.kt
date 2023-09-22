package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.library.form.NotBlank
import com.heerkirov.hedge.server.utils.types.Opt

data class MappingSourceTagForm(@NotBlank val site: String, @NotBlank val type: String, @NotBlank val code: String, val name: Opt<String>, val otherName: Opt<String?>)