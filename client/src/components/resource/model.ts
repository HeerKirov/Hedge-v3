

export interface VersionLock {
    frontend: Version
    server: Version
    cli?: Version
}

export interface Version {
    version: string
    updateTime: number
}

export interface VersionStatusSet {
    frontend?: VersionStatus
    server?: VersionStatus
    cli?: VersionStatus
}

export interface VersionStatus {
    currentVersion: string
    lastUpdateTime: Date
    latestVersion?: string
}
