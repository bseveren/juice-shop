import { Router } from 'express'

const router = Router()

router.get('/redirect/:email', async (req, res) => {
  const links = new Map([
    ['foo@bar.com', 'https://calendly.com/******logan/***-walkthrough-call'],
    ['foo@bar.com', 'https://calendly.com/sydney-******/15min'],
  ])

  // @ts-expect-error TS(2345) FIXME: Argument of type 'string | undefined' is not assig... Remove this comment to see the full error message
  res.redirect(links.get(req.params.email))
})
