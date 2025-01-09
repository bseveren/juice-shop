@index({ date: 1 }, { expireAfterSeconds: 6 * 31 * 24 * 60 * 60 }) // 6 month of data is enough
@index({ datasourceId: 1, date: -1 }) // recommended from ****
@index({ datasourceId: 1, type: 1, date: -1 }) // showLastVersion
@index({ datasourceId: 1, version: 1, date: -1 }) // retrieveLatestErrorForDatasource
@index({ datasourceId: 1, level: 1, date: -1 }) // frontend queries
@index({ datasourceId: 1, level: 1, type: 1, date: -1 }) // frontend queries
@modelOptions({
  schemaOptions: {
    collection: settings.get('DATASOURCE_LOGS_COLLECTION'),
    toObject: {
      versionKey: false
    },
    timestamps: false
  }
})
export class DatasourceLog {
  @prop({
    required: [true, 'missing datasourceId']
  })
  public datasourceId!: ObjectId

  @prop({
    required: true,
    default: () => new Date()
  })
  public date!: Date

  @prop({
    required: [true, 'missing type']
  })
  public type!: LogInfoType | LogWarningType | LogUniqueWarningType | LogErrorType

  @prop({
    required: [true, 'missing level']
  })
  public level!: LogLevel

  @prop({
    required: [true, 'missing version'],
    ref: DatasourceVersion
  })
  public version!: Ref<DocumentType<DatasourceVersion>>

  @prop({
    required: [true, 'missing contentVersion']
  })
  public contentVersion!: number

  @prop({
    required: [true, 'missing payload'],
    default: {}
  })
  public payload!: unknown

  @prop()
  public entryIndex?: number

  public toJSON (this: DocumentType<DatasourceLog>): SerializedDatasourceLog {
    const obj = this.toObject()
    delete obj._id
    return obj
  }

  public static async addLog (log: NonFunctionProperties<DatasourceLog>) {
    const doc = new DatasourceLogModel(log)
    return await doc.save()
  }

  public static async retrieveLatestErrorForDatasource (datasource: Populated<Datasource>) {
    const draftVersion = datasource.versions.find(v => v.state === DatasourceVersionState.DRAFT)!
    const liveVersion = datasource.versions.find(v => v.state === DatasourceVersionState.LIVE)
    const lastLog = await DatasourceLogModel.findOne({
      datasourceId: datasource._id,
      $or: typeof liveVersion !== 'undefined'
        ? [{
          version: draftVersion._id
        }, {
          version: liveVersion._id
        }]
        : [{ version: draftVersion._id }]
    // note: we sort by `date` instead of `_id` because `_id` doesn't store millisecond
    }).sort({ date: -1 }).exec()
    if (lastLog === null || lastLog.level !== LogLevel.ERROR) {
      return undefined
    }
    return lastLog as Omit<DatasourceLog, 'level' | 'type'> & { type: LogErrorType, level: LogLevel.ERROR }
  }
}
