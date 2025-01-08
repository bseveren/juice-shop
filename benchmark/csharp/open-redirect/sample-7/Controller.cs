using System;
using System.Collections.Generic;
using System.Net;
using System.Web;
using System.Web.Mvc;
using AcmeCorp.Helpers;

namespace AcmeCorp.Controller
{
    public class VisibilityController
    {
        [HttpPost]
        public ActionResult hideItem(HideItemModel model)
        {
            if (!ModelState.IsValid)
            {
                return InvalidRequest();
            }

            var (itemType, itemId) = model;
            try
            {
                var result = VisibilityHelper.hideItem(itemType, itemId);
            }
            catch (Exception ex)
            {
                Log.Error(ex.InnerException.Message);
            }

            return Redirect($"~/{itemType}/{itemId}");
        }
    }
}
