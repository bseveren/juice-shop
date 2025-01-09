export const Mutation = {
  cloneModel: async (
    root: Root,
    { payload }: { payload: CloneModelPayload },
    context: Context,
  ) => {
    assertLoggedIn(context.userId);
    assertBuilderAccess(context);

    const {
      dataLoaders: { modelLoader },
    } = context;

    const { archetype, modelId, languages, name, typeId } = payload;
    const model = await modelLoader.load(new ObjectId(modelId));
    const clonedModel = await model.clone(context, {
      archetype,
      languages,
      name,
      typeId: new ObjectId(typeId),
    });

    pubSub.publish(SUBSCRIPTIONS.MODEL, {
      modelId: clonedModel._id.toString(),
    });
    return clonedModel;
  },
  cloneModels: async (
    root: Root,
    { payload: { modelIds } }: { payload: CloneModelsPayload },
    context: Context,
  ) => {
    assertLoggedIn(context.userId);
    assertBuilderAccess(context);

    const {
      dataLoaders: { modelLoader },
    } = context;

    return modelIds.map(async modelId => {
      const model = await modelLoader.load(new ObjectId(modelId));
      const clonedModel = await model.clone(context);
      pubSub.publish(SUBSCRIPTIONS.MODEL, {
        modelId: clonedModel._id.toString(),
      });
      return clonedModel;
    });
  },
  createModel: async (
    root: Root,
    { payload }: { payload: CreateModelPayload },
    context: Context,
  ) => {
    assertLoggedIn(context.userId);
    assertBuilderAccess(context);

    const createdModel = await ModelModel.createCustom(context, payload);
    pubSub.publish(SUBSCRIPTIONS.MODEL, {
      modelId: createdModel._id.toString(),
    });
    return createdModel;
  },
  publishModel: async (
    root: Root,
    { payload }: { payload: PublishModelPayload },
    context: Context,
  ) => {
    assertLoggedIn(context.userId);
    assertBuilderAccess(context);

    const {
      dataLoaders: { modelLoader },
    } = context;

    const { modelId } = payload;
    const model = await modelLoader.load(new ObjectId(modelId));

    if (!model.isGlobal && !model.roles.length) {
      throw new ApolloError(
        'Model does not have roles specified',
        'NO_ROLES_SPECIFIED',
      );
    }

    return model.publish(context);
  },
  setArchivedModel: (
    root: Root,
    { payload }: { payload: SetArchivedModelPayload },
    context: Context,
  ) => {
    assertLoggedIn(context.userId);
    const { modelIds, isArchived } = payload;

    return Promise.all(
      modelIds.map(async id => {
        const newModel = await ModelModel.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { isArchived },
        ).exec();

  copyModelField: async (
    root: Root,
    input: { payload: CopyModelFieldPayload },
    context: Context,
  ) => {
    assertLoggedIn(context.userId);
    const {
      dataLoaders: { modelLoader },
    } = context;

    const { modelId, index, sourceFieldId } = input.payload;
    const model = await modelLoader.load(new ObjectId(modelId));
    let sourceField;
    sourceField = await Field.findOne({
      fieldId: new ObjectId(sourceFieldId),
      modelId: model._id,
      __kind: 'field',
    }).exec();

    if (!sourceField) {
      sourceField = await Field.findOne({
        _id: new ObjectId(sourceFieldId),
        modelId: model._id,
        __kind: 'field',
      }).exec();

      if (!sourceField) {
        throw new UserInputError('Copy failed, field was not found on model', {
          modelId,
          fieldId: sourceFieldId,
        });
      }
    }

    // This helps keeping relation of old `parentId` and new generated ID
    const newIDsMap = new Map<string, ObjectId>();
    /**
     * **WARNING: This mutates the original object**.
     *
     * **WARNING: This loses relation with `parentId`**.
     *
     * Assigns new IDs and returns the original object
     * with the new parameters set.
     * This allows to insert new object into the collection based on the old one.
     * New parameters include:
     * - key
     * - _id
     * - fieldId
     * @param field Field to be copied
     * @param options Additional options when copying field
     */
    const assignNewID = (
      field: DocumentDefinition<FieldDocument>,
      options: {
        modelIndex: number;
      },
    ) => {
      const { modelIndex } = options;
      const newID = new ObjectId();
      if (newIDsMap.has(newID.toHexString())) {
        throw new Error('Generated conflicting IDs. Please try again.');
      }

      newIDsMap.set(field.fieldId.toHexString(), newID);
      const newField: DocumentDefinition<FieldDocument> = Object.assign(field, {
        key: Field.generateKey(),
        modelIndex,
        _id: newID,
        fieldId: newID,
      });

      return newField;
    };

    /**
     * **WARNING: This mutates the original object**.
     *
     * When the fields are copied, new IDs are generated for them.
     * In order to keep the parent-child relation we need to re-map (regenerate)
     * the relation by refreshing the `parentId`s with the new ones (keeping the mapping).
     *
     * @param field Field whose `parentId` will be regenerated
     */
    const mapParentID = (field: DocumentDefinition<FieldDocument>) => {
      if (!field.parentId) {
        return field;
      }

      const parentId = newIDsMap.get(field.parentId.toHexString());

      if (!parentId) {
        throw new Error(`Cannot find mapping for parentId:${field.parentId}`);
      }

      return Object.assign(field, { parentId });
    };

    const newIndex = (index ?? sourceField.modelIndex) + 1;
    const children = await sourceField.getChildren();
    const copiedField = assignNewID(sourceField.toObject(), {
      modelIndex: newIndex,
    });

    const copiedChildren = children
