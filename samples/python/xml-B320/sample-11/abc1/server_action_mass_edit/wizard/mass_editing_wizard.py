import json

from lxml import etree

from odoo import _, api, fields, models

class MassEditingWizard(models.TransientModel):
    _name = "mass.editing.wizard"
    _description = "Wizard for mass edition"

    selected_item_qty = fields.Integer(readonly=True)
    remaining_item_qty = fields.Integer(readonly=True)
    operation_description_info = fields.Text(readonly=True)
    operation_description_warning = fields.Text(readonly=True)
    operation_description_danger = fields.Text(readonly=True)
    message = fields.Text(readonly=True)

    @api.model
    def default_get(self, fields):
        res = super().default_get(fields)
        server_action_id = self.env.context.get("server_action_id")
        server_action = self.env["ir.actions.server"].sudo().browse(server_action_id)
        active_ids = self.env.context.get("active_ids")

        if not server_action:
            return res

        original_active_ids = self.env.context.get("original_active_ids", active_ids)
        operation_description_info = False
        operation_description_warning = False
        operation_description_danger = False
        if len(active_ids) == len(original_active_ids):
            operation_description_info = _(
                "The treatment will be processed on the %(amount)d selected record(s)."
            ) % {
                "amount": len(active_ids),
            }
        elif len(original_active_ids):
            operation_description_warning = _(
                "You have selected %(origin_amount)d "
                "record(s) that can not be processed.\n"
                "Only %(amount)d record(s) will be processed."
            ) % {
                "origin_amount": len(original_active_ids) - len(active_ids),
                "amount": len(active_ids),
            }
        else:
            operation_description_danger = _(
                "None of the %(amount)d record(s) you have selected can be processed."
            ) % {
                "amount": len(active_ids),
            }
        # Set values
        res.update(
            {
                "selected_item_qty": len(active_ids),
                "remaining_item_qty": len(original_active_ids),
                "operation_description_info": operation_description_info,
                "operation_description_warning": operation_description_warning,
                "operation_description_danger": operation_description_danger,
                "message": server_action.mass_edit_message,
            }
        )

        return res

    def onchange(self, values, field_names, fields_spec):
        first_call = not field_names
        if first_call:
            field_names = [fname for fname in values if fname != "id"]
            missing_names = [fname for fname in fields_spec if fname not in values]
            defaults = self.default_get(missing_names)
            for field_name in missing_names:
                values[field_name] = defaults.get(field_name, False)
                if field_name in defaults:
                    field_names.append(field_name)

        server_action_id = self.env.context.get("server_action_id")
        server_action = self.env["ir.actions.server"].sudo().browse(server_action_id)
        if not server_action:
            return super().onchange(values, field_names, fields_spec)
        dynamic_fields = {}

        for line in server_action.mapped("mass_edit_line_ids"):
            values["selection__" + line.field_id.name] = "ignore"
            values[line.field_id.name] = False

            dynamic_fields["selection__" + line.field_id.name] = fields.Selection(
                [()], default="ignore"
            )

            dynamic_fields[line.field_id.name] = fields.Text([()], default=False)

        self._fields.update(dynamic_fields)

        res = super().onchange(values, field_names, fields_spec)
        if not res["value"]:
            value = {key: value for key, value in values.items() if value is not False}
            res["value"] = value

        for field in dynamic_fields:
            self._fields.pop(field)

        view_temp = (
            self.env["ir.ui.view"]
            .sudo()
            .search([("name", "=", "Temporary Mass Editing Wizard")], limit=1)

    @api.model
    def get_view(self, view_id=None, view_type="form", **options):
        view = self.env["ir.ui.view"].sudo().browse(view_id)
        server_action = view.mass_server_action_id
        self = self.with_context(server_action_id=server_action.id)
        if not server_action:
            return super().get_view(view_id, view_type, **options)
        result = super().get_view(view_id, view_type, **options)
        arch = etree.fromstring(result["arch"])
        main_xml_group = arch.find('.//group[@name="group_field_list"]')
        for line in server_action.mapped("mass_edit_line_ids"):
            self._insert_field_in_arch(line, line.field_id, main_xml_group)
            if line.field_id.ttype == "one2many":
                comodel = self.env[line.field_id.relation]
                result["models"] = dict(
                    result["models"], **{comodel._name: tuple(comodel.fields_get())}
                )
        result["arch"] = etree.tostring(arch, encoding="unicode")
        return result
