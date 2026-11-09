export type DrivingField = { id: string; name: string; value: string };

export const applyDrivingFields = new Function(
  "fields",
  `
  var jq = window.jQuery;
  function write(element, value) {
    if (jq) {
      var chain = jq(element);
      chain.val(value);
      if (chain.datepicker) {
        try { chain.datepicker("update", value); } catch (error) {}
      }
      chain.trigger("input");
      chain.trigger("change");
      return;
    }
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }
  for (var index = 0; index < fields.length; index += 1) {
    var field = fields[index];
    var found = [];
    if (field.id) {
      var byId = document.getElementById(field.id);
      if (byId) found.push(byId);
    }
    if (found.length === 0 && field.name) found.push.apply(found, document.getElementsByName(field.name));
    for (var item = 0; item < found.length; item += 1) {
      var element = found[item];
      if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
        element.checked = element.value === field.value;
        element.dispatchEvent(new Event("change", { bubbles: true }));
        continue;
      }
      if (element instanceof HTMLSelectElement) {
        var wanted = String(field.value).replace(/\\s+/g, "");
        var option = null;
        for (var choice = 0; choice < element.options.length; choice += 1) {
          var candidate = element.options[choice];
          if (candidate.value === field.value || (candidate.textContent || "").replace(/\\s+/g, "") === wanted) {
            option = candidate;
            break;
          }
        }
        var next = option ? option.value : field.value;
        if (element.multiple && jq) {
          var selected = [];
          for (var chosen = 0; chosen < element.selectedOptions.length; chosen += 1) selected.push(element.selectedOptions[chosen].value);
          selected.push(next);
          jq(element).val(selected).trigger("change");
          continue;
        }
        write(element, next);
        continue;
      }
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) write(element, field.value);
    }
  }
`,
) as (fields: DrivingField[]) => void;

export const clickDrivingSearch = new Function(
  `
  var controls = document.querySelectorAll("a, button, input");
  var button = null;
  for (var index = 0; index < controls.length; index += 1) {
    var element = controls[index];
    if (element.closest("nav, aside, header, #left-panel, .header, .gnb")) continue;
    if (element instanceof HTMLInputElement && ["button", "submit", "image"].indexOf(element.type) === -1) continue;
    var raw = element instanceof HTMLInputElement ? element.value : element.textContent || "";
    if (raw.replace(/\\s+/g, "") === "검색") {
      button = element;
      break;
    }
  }
  if (!(button instanceof HTMLElement)) return false;
  button.click();
  return true;
`,
) as () => boolean;
