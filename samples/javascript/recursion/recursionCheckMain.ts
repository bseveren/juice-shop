import {removeNullProperties} from "./recursioncheck";

const express = require("express");

const router = express.Router();

router.get("/cleanForm", function (req, res) {
    const filledForm = req.query.filledForm;
    const cleanedFilledForm = makeObjectCleaner(filledForm);
    res.status(200).send(cleanedFilledForm);
});

export function makeObjectCleaner<T extends Record<string, any>>(obj: T): T {
    return removeNullProperties(obj);
}