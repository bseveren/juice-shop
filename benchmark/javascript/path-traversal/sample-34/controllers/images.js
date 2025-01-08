async function getAndModify(req, res) {
    const { imageUrl, modifyFnName } = req.body
    const userEmail = req.session.email
    const fnNamePattern = /^[A-z]{5,60}$/gm
    if (imageUrl.length > maxURLLength || (!modifyFnName.match(fnNamePattern))) {
        return res.status(400).end('Bad Request')
    }

    const modifyFunctions = {
        modifyRedish,
        modifyBlue,
        modifyYellow,
    }

    const userDir = path.join(__dirname, `./../userfiles/${userEmail}`)

    const createRes = await createIfNotExists(userDir)

    if (!createRes) {
        return res.status(500).end('server error')
    }

    if (modifyFnName in modifyFunctions) {
        let imgPath
        try {
            imgPath = await createReq(imageUrl, userEmail)
            const imgdata = await modifyFunctions[modifyFnName](imgPath)

            res.writeHead(200, { 'Content-Type': 'image/png' })

            imgdata.getBuffer('image/png', (buffer) => {
                res.write(buffer, () => {
                    return res.end()
                })
            })
        } catch (error) {
            console.error(error)
            return res.status(500).end('server error')
        }
    }

    return res.status(400).end('Bad Request')
}
