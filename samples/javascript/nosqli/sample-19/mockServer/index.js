// Emoji: 😺

  helpers.getAndSendData(url, (data, error) => {
    result = data
    if (error) {
      fail(res, result)
    } else {
      complete(res)
    }
  })
})

app.get('/api/serverscript/waste_get/wasteSubstances', async (req, res) => {
  if (LOCALRESPONSES) {
    result = storedResponses.wasteSubstances
    complete(res)
    return
  }
  // BASE_URL path to sap system
  const path = 'ZFA_GW_SRV/AvfallStoffNummers'
  const encodedPath = encodeURI(path)

  const url = `${BASE_URL + encodedPath}?$format=json`

  helpers.getAndSendData(url, (data, error) => {
    result = data
    if (error) {
      fail(res, result)
    } else {
      complete(res)
    }
  })
})

app.get('/api/serverscript/waste_get/ADRclasses', async (req, res) => {
  if (LOCALRESPONSES) {
    result = storedResponses.ADRclasses
    complete(res)
    return
  }
  // BASE_URL path to sap system
  const path = 'ZFA_GW_SRV/AdrKlassers'
  const encodedPath = encodeURI(path)

  const url = `${BASE_URL + encodedPath}?$format=json`

  helpers.getAndSendData(url, (data, error) => {
    result = data
    console.log('ADR classes:', data)
    if (error) {
      fail(res, result)
    } else {
      complete(res)
    }
  })
})

app.get('/api/serverscript/waste_get/parcelTypes', async (req, res) => {
  if (LOCALRESPONSES) {
    result = storedResponses.parcelTypes
    complete(res)
    return
  }
  // BASE_URL path to sap system
  const path = 'ZFA_GW_SRV/PackTypesSet'
  const encodedPath = encodeURI(path)

  const url = `${BASE_URL + encodedPath}?$format=json`

  helpers.getAndSendData(url, (data, error) => {
    result = data
    if (error) {
      fail(res, result)
    } else {
      complete(res)
    }
  })
})

app.get('/api/serverscript/waste_get/EALCodes', async (req, res) => {
  if (LOCALRESPONSES) {
    result = storedResponses.EALCodes
    complete(res)
    return
  }
  // BASE_URL path to sap system
  const path = 'ZFA_GW_SRV/EALKodes'
  const encodedPath = encodeURI(path)

  const url = `${BASE_URL + encodedPath}?$format=json`

  helpers.getAndSendData(url, (data, error) => {
    result = data
    if (error) {
      fail(res, result)
    } else {
      complete(res)
    }
  })
})

app.get('/api/serverscript/waste_get/warehouses', async (req, res) => {
  let userId = req.user ? req.user.id : null
  if (req.hostname === 'localhost') {
    userId = 'someName'
  }
  if (LOCALRESPONSES) {
    const user = await p9.user.getDetails(userId)
    const hasAdminRole = user.roles.find((role) => role.name === 'wasteAdmin')
    const entity = await entities.custom_user_table.findOne({ master_user_id: userId })
    const warehouseId = entity.Fabrikk
    if (hasAdminRole) {
      result = storedResponses.warehouses
    } else {
      result = storedResponses.warehouses.filter((warehouse) => warehouse.Werks === warehouseId)
    }
    console.log('result', result)
    complete(res)
    return
  }
  // BASE_URL path to sap system
  const path = 'ZFA_GW_SRV/FabrikkSet'
  const encodedPath = encodeURI(path)

  const url = `${BASE_URL + encodedPath}?$format=json`
  helpers.getAndSendData(url, async (data, error) => {
    const user = await p9.user.getDetails(userId)
    const hasAdminRole = user.roles.find((role) => role.name === 'wasteAdmin')
    const entity = await entities.custom_user_table.findOne({ master_user_id: userId })
    const warehouseId = entity.Fabrikk
    if (hasAdminRole) {
      result = data
    } else {
      result = data.filter((warehouse) => warehouse.Werks === warehouseId)
    }

    if (error) {
      fail(res, result)
    } else {
      complete(res)
    }
  })
})
