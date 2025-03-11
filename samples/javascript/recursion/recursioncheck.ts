const express = require("express");

const router = express.Router();

router.get("/cleanForm", function (req, res) {
    const filledForm = req.query.filledForm;
    const cleanedFilledForm = makeObjectCleaner(filledForm);
    res.status(200).send(cleanedFilledForm);
});


function removeNullProperties<T extends Record<string, any>>(obj: T): T {
    const result = {} as T;
    for (const [key, value] of Object.entries(obj)) {
        if (value !== null) {
            if (typeof value === "object") {
                result[key as keyof T] = removeNullProperties(value);
            } else {
                result[key as keyof T] = value;
            }
        }
    }
    return result;
}

export function makeObjectCleaner<T extends Record<string, any>>(obj: T): T {
    return removeNullProperties(obj);
}

