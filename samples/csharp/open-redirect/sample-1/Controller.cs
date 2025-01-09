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
        public ActionResult PlaceOrder(string productId, Guid objectId, int quantity)
        {
            var result = OrderHelper.place(productId, objectId, quantity, HttpContext.Profile);

            var param = new Dictionary<string, string>
                            {
                                {"productid", productId.ToString()},
                                {"orderid", result.orderId.ToString()},
                            };

            var baseUrl = "/order/view.aspx";

            if (result.state == PlaceOrderError.Ok)
            {
                baseUrl = "/order/succes.aspx";
            }
            else
            {
                param.Add("hasError", result.ToString());
            }

            var destinationUrl = string.Format("{0}?{1}", baseUrl, param.ToString("=", "&"));
            return Redirect(destinationUrl);
        }
    }
}
