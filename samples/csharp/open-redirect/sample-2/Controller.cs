using System;
using System.Collections.Generic;
using System.Net;
using System.Web;
using System.Web.Mvc;
using AcmeCorp.Helpers;

namespace AcmeCorp.Controller
{
    public class OrderController
    {
        [HttpPost]
        public ActionResult EditProductQuantity(string orderId, string productId, int quantity)
        {
            if (!OrderHelper.canEditOrder(orderId))
            {
                return BadRequest();
            }

            var result = OrderHelper.updateProductQuantity(orderId, productId, quantity);

            string queryStringAddition = string.Empty;
            if (OrderHelper.IsProductExhausted(result))
            {
                queryStringAddition = String.Format("&exhausted={0}", productId);

            }

            return Redirect(string.Format("/order/detail.aspx?orderId={0}&status=1{1}", orderId, queryStringAddition));
        }
    }
}
