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
        public ActionResult hideItem(string itemType, int itemId)
        {
            if (!ModelState.IsValid)
            {
                return InvalidRequest();
            }

            try
            {
                var result = VisibilityHelper.hideItem(ItemType, ItemId);
            }
            catch (Exception ex)
            {
                Log.Error(ex.InnerException.Message);
            }

            return Redirect($"/{itemType}/{itemId}");
        }
    }
}
