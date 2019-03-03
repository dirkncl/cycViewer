/*************************************************************
                cycParser.js
 https://github.com/douglascrockford/TheJavaScriptEncyclopedia
            =====================
            To parse the cyc file
 *************************************************************/
 
    // cyc.js
    // 2016-01-13
    /*jslint devel: true */
var cyc = (function () {
      "use strict";
      var pair = {
        "(": ")",
        "[": "]",
        "{": "}",
        "<": ">",
        "'": "'",
        "\"": "\"",
        "`": "`",
        "@": "@"
      };
      var lx = /\n|\r\n?/g;                           // line end
      var tx = /@[!#-&*-\/:;=?@\\\^_`|~]?|[""{}()<>\[\]]|[^@""{}()<>\[\]]+/g;  // text or some special
      
      
      function error(message) {
          console.error(message);
          debugger;
          throw message;
      }

      function parse(text, rules) {
        var closer;
        var line_nr = 0;
        var lines = [];
        var name;
        var part_nr = 0;
        var stack = [];
        var structure;
        var temp;
        var token;
        var top;
        function deposit(thing) {
            var line;
            if (thing === "") {
                structure.push([]);
            } 
            else {
              line = structure[structure.length - 1];
              if (line.length && typeof thing === "string"&& typeof line[line.length - 1] === "string") {
                line[line.length - 1] += thing;
              } 
              else {
                line.push(thing);
              }
            }
        }

        function next_token() {
            if (part_nr >= lines[line_nr].length) {
                part_nr = 0;
                line_nr += 1;
                return line_nr >= lines.length
                    ? null
                    : "";
            } else {
                var next = lines[line_nr][part_nr];
                part_nr += 1;
                return next;
            }
        }
        lines = text.split(lx).map(function (value) {
            return value.match(tx) || "";
        });
        structure = ["", []];
        while (true) {
            token = next_token();
            switch (token) {
            case null:
                if (stack.length > 0) {
                    top = stack[stack.length - 1];
                    return error(typeof top === "string"
                        ? "Missing " + top + " to close @" + structure[0]
                        : "Missing @end(" + structure[0] + ")");
                }
                return structure;

            case "@@":
                deposit("@");
                break;
            case "@":
                token = next_token();
                name = token.trim();
                if (name === "begin" || name === "end"|| typeof rules[name] === "object") {
                    token = next_token();
                    closer = pair[token];
                    if (typeof closer !== "string") {
                        return error("Bad opener @" + name + " " + token);
                    }
                    if (closer === "@") {
                        deposit([name]);
                    }
                    else {
                        stack.push(structure, closer);
                        structure = [name, []];
                    }
                }
                else {
                    return error("Not a name: @" + name);
                }
                break;
            case stack[stack.length - 1]:
                stack.pop();
                switch (structure[0]) {
                case "begin":
                    if (structure.length !== 2 || structure[1].length !== 1) {
                        return error("bad begin");
                    }
                    name = structure[1][0].trim();
                    if (
                        typeof rules[name] !== "object"
                        || name === "begin"
                        || name === "end"
                    ) {
                        return error("bad @begin(" + name + ")");
                    }
                    if (
                        stack.length > 1
                        && typeof rules[name].level === "number"
                    ) {
                        return error(
                            "Misplaced @begin(" + structure[1][0].trim() + ")"
                        );
                    }
                    structure = [name, []];
                    break;
                case "end":
                    if (structure.length !== 2 || structure[1].length !== 1) {
                        return error("bad end");
                    }
                    name = structure[1][0].trim();
                    temp = stack.pop();
                    if (!temp || !temp[0]) {
                        return error("Unexpected @end(" + name + ")");
                    }
                    if (name === temp[0]) {
                        structure = stack.pop();
                        if (rules[name].parse !== undefined) {
                            temp = rules[name].parse(temp);
                        }
                        deposit(temp);
                        break;
                    } 
                    else {
                        return error(
                          (typeof stack[stack.length - 1] === "string")? "Expected " + stack[stack.length - 1] + " to close @" + temp[0] + " and instead  saw @end(" + name + ")" : "Expected @end(" + temp[0] +") and instead saw @end(" + name + ")"
                        );
                    }
                default:
                    temp = structure;
                    structure = stack.pop();
                    name = temp[0];
                    if (rules[name].parse !== undefined) {
                      temp = rules[name].parse(temp);
                    }
                    deposit(temp);
                    if (stack.length && typeof rules[name].level === "number") {
                      return error("Misplaced @" + temp.join(" "));
                    }
                }
                break;
            default:
              if (token[0] === "@") {
                if (rules[structure[0]] !== undefined) {
                    deposit([token]);
                } 
                else {
                  return error("Unexpected @" + temp.join(" "));
                }
              } 
              else {
                deposit(token);
              }
            }
        }
    }
    return function (text, rules) {
        var course;         // The current meta nesting.
        var course_level;   // The associated level numbering.
        var pass;           // The current pass from rules["*"].
        var product;        // The product of the passes.
        var stack;          // The current nesting.
        var structure = parse(text, rules);

        function apply(name, text, structure) {
            var rule = rules[name][pass];
            while (text.slice(-1) === "\n") {
                text = text.slice(0, -1);
            }
            return (typeof rule === "function")
                ? rule(text, structure)
                : (typeof rule === "string")
                    ? rule
                    : (Array.isArray(rule))
                        ? (rule[0] || "") + text + (rule[1] || "")
                        : text;
        }
        function uncourse(level) {
            var closer;
            var result = "";
            while (
                course_level.length > 0 &&
                course_level[course_level.length - 1] >= level
            ) {
                closer = rules[course.pop()][pass + "_close"];
                course_level.pop();
                if (typeof closer === "function") {
                    result = closer(result);
                } else if (typeof closer === "string") {
                    result = closer;
                }
            }
            return result;
        }


        function process(structure) {
            var level;
            var name = structure[0];
            var para_result = "";
            var result = "";
            var rule = rules[name];

            level = rule.level;
            stack.push(name);
            if (typeof level === "number") {
                if (!name) {
                    para_result += apply("", "", structure);
                }
                para_result += uncourse(level);
                course.push(name);
                course_level.push(level);
            }
            structure.slice(1).forEach(function (row) {
                if (row.length === 0) {
                    if (!name && result) {
                        para_result += apply("", result, structure);
                        result = "";
                    }
                } else {
                    row.forEach(function (thing) {
                        if (typeof thing === "string") {
                            thing = apply("$", thing, structure);
                        } else {
                            var rule = rules[thing[0]];
                            if (rule === undefined) {
                                rule = rules[stack[stack.length - 1]][thing[0]];
                                if (typeof rule !== "function") {
                                    return error("Unrecognized " + thing[0]);
                                }
                                result = rule(result);
                                return;
                            }
                            if (!name && rule.level !== undefined) {
                                if (result) {
                                    para_result += apply("", result, structure);
                                    result = "";
                                }
                                para_result += process(thing);
                                thing = "";
                            } else {
                                thing = process(thing);
                            }
                        }
                        result += thing;
                    });
                }
                if (result) {result += "\n";}
            });
            result = para_result + apply(name, result, structure);

            stack.pop();
            if (stack.length === 0) { result += uncourse(0);}
            return result;
        }
        product = Object.create(null);
        rules["*"].forEach(function (which) {
            pass = which;
            course = [];
            course_level = [];
            stack = [];
            product[pass] = process(structure);
        });
        return (rules["@"] !== undefined)
            ? rules["@"](product)
            : product;
    };
}());

/////////////////////////////
// onehtml.js
// 2016-01-13

// These Cyc rules produce a single HTML file.

/*jslint
    devel: true, node
*/

function make_onehtml() {
    "use strict";
    var link_text = Object.create(null);
    var nx = /\n|\r\n?/;
    var sx = /[!-@\[-\^`{-~]/g;
    var title = "";
    function entityify(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function special_encode(text) {
        if (typeof text === "string") {
            return text.toLowerCase().replace(sx, function (a) {
                return a.charCodeAt(0).toString(16).toUpperCase();
            });
        }
    }

    function stuff_name(text, structure) {
        structure.name = text;
        link_text[structure.link.toLowerCase()] = text;
        return text;
    }

    function stuff_link(text, structure) {
        text = text.trim();
        structure.link = text;
        return text;
    }

    function wrap(tag) {
        return function (text, structure) {
            return "\n<" + tag + " id='" + special_encode(structure.link) + "'>" + text + "</" + tag + ">";
        };
    }

    return {
        "*": ["link", "name", "gen"],
        "@": function (product) {
            return "<!DOCTYPE html><html><head><meta charset='utf-8'>"+ "<link rel='stylesheet' href='css/encyclopedia.css' "+ "type='text/css'>"+ "<title>" + entityify(title) + "</title>"+ "</head><body>" + product.gen + "</body></html>";
        },
        "@-": {                         // soft hyphen
            link: "",
            name: "",
            gen: "&shy;"
        },
        $: {                            // the naked text rule
            name: entityify,
            gen: entityify
        },
        "": {                           // the default para rule
            link: "",
            name: "",
            gen: ["\n<p>", "</p>"]
        },
        aka: {
            link: "",
            name: ["<dfn>", "</dfn>"],
            gen: ["<dfn>", "</dfn>"]
        },
        appendix: {
            level: 2,
            link: stuff_link,
            name: stuff_name,
            gen: wrap("h1")
        },
        article: {
            level: 4,
            link: stuff_link,
            name: stuff_name,
            gen: wrap("h3")
        },
        b: {
            gen: ["<b>", "</b>"]
        },
        book: {
            level: 1,
            name: function (text) {
                title = text;
            },
            gen: wrap("h1")
        },
        chapter: {
            level: 2,
            link: stuff_link,
            name: stuff_name,
            gen: wrap("h1")
        },
        comment: {
            link: "",
            name: "",
            gen: ""
        },
        i: {
            gen: ["<i>", "</i>"]
        },
        link: {
            link: stuff_link,
            gen: function (ignore, structure) {
                var name = link_text[structure.link.toLowerCase()];
                if (name !== undefined) {
                    return "<a href='#"+ special_encode(structure.link)+ "'>" + name + "</a>";
                } 
                else {
                    return structure.link + " <strong>MISSING LINK</strong>";
                }
            }
        },
        list: {
            name: "",
            link: "",
            gen: function (text) {
                return "<ul><li>" + text.split(nx).join("</li><li>") + "</li></ul>";
            }
        },
        program: {
            name: "",
            link: "",
            gen: ["\n<pre>", "</pre>"]
        },
        reserved: {
            name: "",
            link: "",
            gen: "<a href='#reserved word'><strong>reserved word</strong></a>"
        },
        section: {
            level: 5,
            link: "",
            name: "",
            gen: wrap("h4")
        },
        slink: {
            gen: function (text, structure) {
                var name = link_text[structure.link.toLowerCase()];
                if (name !== undefined) {
                    return "<a href='#" + special_encode(structure.link)+ "'>" + name + "</a>";
                } else {
                    return text + " <strong>MISSING LINK</strong>";
                }
            }
        },
        specimen: {
            level: 3,
            link: stuff_link,
            name: stuff_name,
            gen: wrap("h2")
        },
        sub: {
            name: ["<sub>", "</sub>"],
            gen: ["<sub>", "</sub>"]
        },
        super: {
            name: ["<sup>", "</sup>"],
            gen: ["<sup>", "</sup>"]
        },
        t: {
            name: ["<tt>", "</tt>"],
            gen: ["<tt>", "</tt>"]
        },
        table: {
            link: "",
            name: "",
            gen: ["<table><tbody>", "</tbody></table>"],
            parse: function (structure) {
                var itemcont = [];
                var item = ["-td", itemcont];
                var rowcont = [item];
                var row = ["-tr", rowcont];
                var tablecont = [row];
                var table = ["table", tablecont];
                structure.slice(1).forEach(function (rowrow) {
                    rowrow.forEach(function (thing) {
                        if (Array.isArray(thing)) {
                            switch (thing[0]) {
                            case "@!":
                                item[0] = "-th";
                                break;
                            case "@|":
                                itemcont = [];
                                item = ["-td", itemcont];
                                rowcont.push(item);
                                break;
                            case "@_":
                                itemcont = [];
                                item = ["-td", itemcont];
                                rowcont = [item];
                                row = ["-tr", rowcont];
                                tablecont.push(row);
                                break;
                            default:
                                itemcont.push(thing);
                            }
                        } else {
                            itemcont.push(thing);
                        }
                    });
                });
                return table;
            },
            "@!": true,
            "@_": true,
            "@|": true
        },
        "-td": {
            link: "",
            name: "",
            gen: ["<td>", "</td>"]
        },
        "-th": {
            link: "",
            name: "",
            gen: ["<th>", "</th>"]
        },
        together: {
            gen: function (text) {
                return text;
            },
            parse: function (structure) {
                var stuff = structure[1];
                structure.slice(2).forEach(function (row) {
                    stuff = stuff.concat(" ", row);
                });
                return ["together", stuff];
            }
        },
        "-tr": {
            link: "",
            name: "",
            gen: ["<tr>", "</tr>"]
        },
        url: {
            gen: function (text) {
                return "<a href='" + text + "'>" + text + "</a>";
            }
        }
    };
}