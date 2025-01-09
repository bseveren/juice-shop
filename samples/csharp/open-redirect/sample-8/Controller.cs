using System;
using System.Collections.Generic;
using System.Log;
using System.Net;
using System.Web;
using System.Web.Mvc;
using AcmeCorp.Helpers;

namespace AcmeCorp.Controller
{
    public class OrderController
    {
        private readonly ISaveObjectHelper _saveObjectHelper;

        public OrderController(ISaveObjectHelper saveObjectHelper)
        {
            _saveObjectHelper = saveObjectHelper;
        }

        [HttpGet]
        public ActionResult SaveObject(Guid objectId, string title, string returnUrl)
        {
            if (objectId == default || string.IsNullOrWhiteSpace(title))
            {
                return new HttpNotFoundResult();
            }

            var (success, _) = _saveObjectHelper.SaveObjectTitle(objectId, title);
            if (!success)
            {
                Log.LogError("SaveObject failed for objectId {0}, title {1}.",
                    objectId,
                    title);
            }
            return !string.IsNullOrWhiteSpace(returnUrl)
                ? Redirect(returnUrl)
                : CreateJsonResponse(success);
        }
    }
}
