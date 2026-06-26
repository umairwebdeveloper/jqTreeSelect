/*!
 * jqTreeSelect Custom Multi-Select Dropdown Plugin
 * Version: 1.2.0
 * Description: A dynamic, searchable, grouped, tree-nesting multi-select plugin.
 * Author: Umair Ashraf (umairashraf5252@gmail.com)
 * License: MIT (https://opensource.org/licenses/MIT)
 * Copyright (c) 2026 Umair Ashraf
 */
(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node/CommonJS
        module.exports = factory(require('jquery'));
    } else {
        // Browser globals
        factory(global.jQuery);
    }
}(typeof window !== 'undefined' ? window : this, function ($) {
    class JqTreeSelect {
        constructor(element, options) {
            this.$originalSelect = $(element);
            
            // Normalize and merge options
            let dataOpts = this._parseDataAttributes(this.$originalSelect);
            let normalizedOpts = this._normalizeOptions(options);
            
            this.settings = $.extend(
                true, 
                {}, 
                $.fn.jqTreeSelect.defaults, 
                dataOpts, 
                normalizedOpts
            );
            
            // Auto-enable nested grouping if select has optgroups, unless explicitly disabled by user
            let hasOptgroups = this.$originalSelect.find("optgroup").length > 0;
            let explicitlyDisabled = (options && options.grouping && options.grouping.nested === false) ||
                                     (dataOpts && dataOpts.grouping && dataOpts.grouping.nested === false);
            if (hasOptgroups && !explicitlyDisabled) {
                this.settings.grouping.nested = true;
            }
            
            this.$btnAll = null;
            this.$btnClear = null;
            this.$btnReset = null;
            this.$btnOpenAll = null;
            this.$btnCloseAll = null;
            this.$wrapper = null;
            this.$display = null;
            this.$placeholder = null;
            this.$selectedText = null;
            this.$countBadge = null;
            this.$chevron = null;
            this.$dropdown = null;
            this.$optionsContainer = null;
            this.$notFound = null;
            this.$searchContainer = null;
            this.defaultSelectedValues = [];
            this.totalOptions = 0;
            this.docClickEvent = null;
            this.displayTooltip = null;
            this.isDisabled = false;

            this.init();
        }

        /**
         * Normalizes flat configuration options into the nested structure for backward compatibility.
         */
        _normalizeOptions(options) {
            if (!options || typeof options !== "object") return {};
            
            let normalized = $.extend(true, {}, options);
            
            const flatMappings = {
                nestedGroups: ["grouping", "nested"],
                collapsibleGroups: ["grouping", "collapsible"],
                groupsCollapsedByDefault: ["grouping", "collapsedByDefault"],
                showExpandAll: ["grouping", "showExpandAll"],
                showCollapseAll: ["grouping", "showCollapseAll"],
                
                showSelectAll: ["actions", "showSelectAll"],
                showClearAll: ["actions", "showClearAll"],
                showReset: ["actions", "showReset"],
                showTotalCount: ["actions", "showTotalCount"],
                
                showSearch: ["search", "enabled"],
                
                width: ["layout", "width"],
                height: ["layout", "height"],
                dropdownHeight: ["layout", "dropdownHeight"]
            };
            
            for (let key in flatMappings) {
                if (options[key] !== undefined) {
                    let [group, prop] = flatMappings[key];
                    if (!normalized[group]) normalized[group] = {};
                    normalized[group][prop] = options[key];
                    delete normalized[key];
                }
            }
            
            return normalized;
        }

        /**
         * Reads and parses data-* attributes from the select element, mapping them to the nested settings.
         */
        _parseDataAttributes($el) {
            let data = $el.data();
            let dataOpts = {};
            
            const dataMappings = {
                layoutWidth: ["layout", "width"],
                layoutHeight: ["layout", "height"],
                layoutDropdownHeight: ["layout", "dropdownHeight"],
                layoutPlaceholder: ["layout", "placeholder"],
                
                actionsShowSelectAll: ["actions", "showSelectAll"],
                actionsShowClearAll: ["actions", "showClearAll"],
                actionsShowReset: ["actions", "showReset"],
                actionsShowTotalCount: ["actions", "showTotalCount"],
                
                groupingNested: ["grouping", "nested"],
                groupingCollapsible: ["grouping", "collapsible"],
                groupingCollapsedByDefault: ["grouping", "collapsedByDefault"],
                groupingShowExpandAll: ["grouping", "showExpandAll"],
                groupingShowCollapseAll: ["grouping", "showCollapseAll"],
                
                searchEnabled: ["search", "enabled"],
                searchPlaceholder: ["search", "placeholder"],
                
                disabled: ["disabled"],
                placeholder: ["layout", "placeholder"]
            };
            
            for (let rawKey in dataMappings) {
                if (data[rawKey] !== undefined) {
                    let path = dataMappings[rawKey];
                    let val = data[rawKey];
                    
                    if (path.length === 1) {
                        dataOpts[path[0]] = val;
                    } else if (path.length === 2) {
                        if (!dataOpts[path[0]]) dataOpts[path[0]] = {};
                        dataOpts[path[0]][path[1]] = val;
                    }
                }
            }
            
            return dataOpts;
        }

        /**
         * Populates the original select element with dynamic option nodes from the settings.data array.
         */
        _buildOptionsFromData(data) {
            let $select = this.$originalSelect;
            $select.empty();

            if (!Array.isArray(data)) return;

            let processOption = (opt, $parent) => {
                let $optEl = $("<option></option>")
                    .val(opt.value)
                    .text(opt.text || opt.value);
                
                if (opt.selected) $optEl.prop("selected", true);
                if (opt.disabled) $optEl.prop("disabled", true);
                
                if (opt.groupPath) {
                    $optEl.attr("data-group-path", opt.groupPath);
                }
                if (opt.groupIdPath) {
                    $optEl.attr("data-group-id-path", opt.groupIdPath);
                }
                if (opt.groupCollapsed !== undefined) {
                    $optEl.attr("data-group-collapsed", opt.groupCollapsed);
                }
                if (opt.groupName) {
                    $optEl.attr("data-group-name", opt.groupName);
                }
                if (opt.groupId) {
                    $optEl.attr("data-group-id", opt.groupId);
                }
                if (opt.subgroupName) {
                    $optEl.attr("data-subgroup-name", opt.subgroupName);
                }
                if (opt.subgroupId) {
                    $optEl.attr("data-subgroup-id", opt.subgroupId);
                }

                $parent.append($optEl);
            };

            data.forEach(item => {
                if (item.options && Array.isArray(item.options)) {
                    let groupName = item.groupName || item.group || "Other";
                    let groupId = item.groupId || item.id || groupName.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
                    
                    item.options.forEach(opt => {
                        opt.groupName = groupName;
                        opt.groupId = groupId;
                        processOption(opt, $select);
                    });
                } else {
                    processOption(item, $select);
                }
            });
        }

        init() {
            let $originalSelect = this.$originalSelect;

            if (!$originalSelect.prop("multiple")) {
                return;
            }

            // Build options programmatically if data source is provided
            if (this.settings.data) {
                this._buildOptionsFromData(this.settings.data);
            }

            $originalSelect.data("jq-tree-select-wrapper", this.$wrapper);

            this.defaultSelectedValues = $originalSelect
                .find("option")
                .filter(function () {
                    let valAttr = $(this).attr("value");
                    if (
                        valAttr === undefined ||
                        valAttr === null ||
                        valAttr === ""
                    ) {
                        return false;
                    }
                    return (
                        $(this).prop("defaultSelected") ||
                        $(this).attr("selected") !== undefined
                    );
                })
                .map(function () {
                    return $(this).val();
                })
                .get();

            this.totalOptions = $originalSelect
                .find("option")
                .filter(function () {
                    let valAttr = $(this).attr("value");
                    return (
                        valAttr !== undefined &&
                        valAttr !== null &&
                        valAttr !== ""
                    );
                }).length;

            let originalClasses = ($originalSelect.attr("class") || "")
                .split(/\s+/)
                .filter(Boolean);
            let originalStyles = ($originalSelect.attr("style") || "")
                .replace(/display\s*:\s*none\s*;?/gi, "")
                .trim();

            $originalSelect.hide();

            this.$wrapper = $(
                '<div class="jq-tree-select position-relative"></div>',
            );
            if (this.settings.layout.width) {
                this.$wrapper.css("width", this.settings.layout.width);
            }

            let requiredClasses = ["form-select", "jq-tree-select-display"];
            let uniqueClasses = [
                ...new Set([...requiredClasses, ...originalClasses]),
            ].join(" ");

            this.$display = $(
                `<div class="${uniqueClasses}" style="${originalStyles}"></div>`,
            );
            if (this.settings.layout.height) {
                this.$display.css({
                    height: this.settings.layout.height,
                    "min-height": this.settings.layout.height,
                });
            }

            let pText = this.settings.layout.placeholder || $originalSelect.data("placeholder") || "Select...";
            this.$placeholder = $(
                `<span class="text-muted placeholder-text"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="me-2" style="vertical-align: middle;"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/><path d="m3 12 2 2 4-4"/></svg>${pText}</span>`,
            );
            this.$selectedText = $(
                '<span class="jq-tree-select-selected-text" style="display:none;"></span>',
            );
            this.$countBadge = $(
                '<span class="badge bg-primary rounded-pill jq-tree-select-badge text-white" style="display:none;"></span>',
            );
            this.$chevron = $(
                '<span class="position-absolute jq-tree-select-chevron" style="position: absolute !important; right: 12px; top: 50%; transform: translateY(-50%); display: inline-flex; align-items: center; pointer-events: none; color: var(--jqtree-text-muted);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>',
            );

            this.$dropdown = $(
                '<div class="dropdown-menu shadow p-2 mt-1 w-100"></div>',
            );
            if (this.settings.layout.dropdownHeight) {
                this.$dropdown.css("max-height", this.settings.layout.dropdownHeight);
            }

            this.$optionsContainer = $("<div></div>");
            this.$notFound = $(
                '<div class="jq-tree-select-not-found text-muted text-center" style="display:none;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-2" style="vertical-align: middle;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>No matches found</div>',
            );

            let showHeader =
                this.settings.actions.showSelectAll ||
                this.settings.actions.showClearAll ||
                this.settings.actions.showReset ||
                this.settings.search.enabled ||
                this.settings.actions.showTotalCount ||
                (this.settings.grouping.collapsible && (this.settings.grouping.showExpandAll || this.settings.grouping.showCollapseAll));

            if (showHeader) {
                let $btnGroup = $(
                    '<div class="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom jq-tree-select-action-header"></div>',
                );

                if (this.settings.search.enabled) {
                    let sPlaceholder = this.settings.search.placeholder || "Search...";
                    this.$searchContainer = $(`
                        <div class="jq-tree-select-search-container flex-grow-1">
                            <div class="input-group input-group-sm">
                                <span class="input-group-text bg-transparent border-end-0 text-muted" style="border-color: var(--bs-gray-200); padding: 0.25rem 0.5rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
                                <input type="text" class="form-control border-start-0 jq-tree-select-search-input ps-0" placeholder="${sPlaceholder}" style="border-color: var(--bs-gray-200); font-size: 0.82rem; height: 30px;">
                            </div>
                        </div>
                    `);
                    $btnGroup.append(this.$searchContainer);

                    let $searchInput = this.$searchContainer.find(
                        ".jq-tree-select-search-input",
                    );
                    $searchInput.on("input", () => {
                        let query = $searchInput.val().toLowerCase().trim();
                        if (query === "") {
                            this.$optionsContainer
                                .find(
                                    ".jq-tree-select-group-wrapper, .jq-tree-select-group-header, .jq-tree-select-subgroup-wrapper, .jq-tree-select-subgroup-header, .jq-tree-select-option",
                                )
                                .show();
                            if (this.settings.grouping.collapsible) {
                                this.$optionsContainer.find(".jq-tree-select-children").each(function () {
                                    let defCollapsed = $(this).data("default-collapsed") === true;
                                    let $toggle = $(this).prev(".jq-tree-select-group-header, .jq-tree-select-subgroup-header").find(".jq-tree-select-group-toggle");
                                    if (defCollapsed) {
                                        $(this).hide();
                                        $toggle.removeClass("expanded").addClass("collapsed");
                                    } else {
                                        $(this).show();
                                        $toggle.removeClass("collapsed").addClass("expanded");
                                    }
                                });
                            }
                            this.$notFound.hide();
                        } else {
                            this.$optionsContainer
                                .find(
                                    ".jq-tree-select-group-wrapper, .jq-tree-select-group-header, .jq-tree-select-subgroup-wrapper, .jq-tree-select-subgroup-header, .jq-tree-select-option",
                                )
                                .hide();
                            let self = this;
                            this.$optionsContainer
                                .find(".jq-tree-select-option")
                                .each(function () {
                                    let optionText = $(this)
                                        .find("label")
                                        .text()
                                        .toLowerCase();
                                    if (optionText.indexOf(query) > -1) {
                                        $(this).show();
                                        let $ancestors = $(this).parents(".jq-tree-select-subgroup-wrapper, .jq-tree-select-group-wrapper");
                                        $ancestors.show();
                                        $ancestors.children(".jq-tree-select-subgroup-header, .jq-tree-select-group-header").show();
                                        if (self.settings.grouping.collapsible) {
                                            let $childrenContainers = $ancestors.children(".jq-tree-select-children");
                                            $childrenContainers.show();
                                            $ancestors.children(".jq-tree-select-group-header, .jq-tree-select-subgroup-header")
                                                .find(".jq-tree-select-group-toggle")
                                                .removeClass("collapsed")
                                                .addClass("expanded");
                                        }
                                    }
                                });

                            let visibleOptions = this.$optionsContainer.find(
                                ".jq-tree-select-option:visible",
                            ).length;
                            if (visibleOptions === 0) {
                                this.$notFound.text("No matches found").show();
                            } else {
                                this.$notFound.hide();
                            }
                        }
                        this.updateHeaderButtons();
                    });
                }

                let hasButtons =
                    this.settings.actions.showSelectAll ||
                    this.settings.actions.showClearAll ||
                    this.settings.actions.showReset ||
                    this.settings.actions.showTotalCount ||
                    (this.settings.grouping.collapsible && (this.settings.grouping.showExpandAll || this.settings.grouping.showCollapseAll));
                if (hasButtons) {
                    let $actionsWrapper = $(
                        '<div class="d-flex gap-1 align-items-center jq-tree-select-actions-wrapper"></div>',
                    );
                    if (this.settings.search.enabled) {
                        $actionsWrapper.addClass("ms-auto");
                    } else {
                        $actionsWrapper.addClass(
                            "w-100 justify-content-between",
                        );
                    }

                    if (this.settings.actions.showTotalCount) {
                        let $totalBadge = $(
                            `<span class="badge bg-light text-dark border me-1 small jq-tree-select-total-options-badge" data-bs-toggle="tooltip" title="Total Options">${this.totalOptions}</span>`,
                        );
                        $actionsWrapper.append($totalBadge);
                        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                            new bootstrap.Tooltip($totalBadge[0]);
                        }
                    }

                    let buttons = [];
                    let self = this;

                    if (this.settings.actions.showSelectAll) {
                        buttons.push({
                            id: "selectAll",
                            title: "Select All",
                            iconSvg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 12 5.25 5 2.625-3"/><path d="m8 12 5.25 5L22 7"/><path d="m16 7-5.25 5"/></svg>`,
                            hoverClass: "jq-tree-select-text-hover-primary",
                            action: () => {
                                self.$optionsContainer
                                    .find('input[type="checkbox"]:visible:not(:disabled)')
                                    .prop("checked", true);
                                self.updateUI(true);
                            }
                        });
                    }
                    if (this.settings.actions.showClearAll) {
                        buttons.push({
                            id: "clearAll",
                            title: "Clear All",
                            iconSvg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
                            hoverClass: "jq-tree-select-text-hover-danger",
                            action: () => {
                                self.$optionsContainer
                                    .find('input[type="checkbox"]:visible:not(:disabled)')
                                    .prop("checked", false);
                                self.updateUI(true);
                            }
                        });
                    }
                    if (this.settings.actions.showReset) {
                        buttons.push({
                            id: "reset",
                            title: "Reset to Default",
                            iconSvg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
                            hoverClass: "jq-tree-select-text-hover-primary",
                            action: () => {
                                self.$optionsContainer
                                    .find(".select-checkbox:visible:not(:disabled)")
                                    .each(function () {
                                        let isDefault =
                                            self.defaultSelectedValues.includes(
                                                $(this).val(),
                                            );
                                        $(this).prop("checked", isDefault);
                                    });
                                self.updateUI(true);
                            }
                        });
                    }
                    if (this.settings.grouping.collapsible && this.settings.grouping.showExpandAll) {
                        buttons.push({
                            id: "openAll",
                            title: "Expand All",
                            iconSvg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7 13 5 5 5-5"/><path d="m7 7 5 5 5-5"/></svg>`,
                            hoverClass: "jq-tree-select-text-hover-primary",
                            action: () => {
                                self.$optionsContainer.find(".jq-tree-select-children").show();
                                self.$optionsContainer.find(".jq-tree-select-group-toggle").removeClass("collapsed").addClass("expanded");
                                self.updateUI(true);
                            }
                        });
                    }
                    if (this.settings.grouping.collapsible && this.settings.grouping.showCollapseAll) {
                        buttons.push({
                            id: "closeAll",
                            title: "Collapse All",
                            iconSvg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m17 11-5-5-5 5"/><path d="m17 17-5-5-5 5"/></svg>`,
                            hoverClass: "jq-tree-select-text-hover-danger",
                            action: () => {
                                self.$optionsContainer.find(".jq-tree-select-children").hide();
                                self.$optionsContainer.find(".jq-tree-select-group-toggle").removeClass("expanded").addClass("collapsed");
                                self.updateUI(true);
                            }
                        });
                    }

                    let saveBtnReference = (id, $elem) => {
                        if (id === "selectAll") self.$btnAll = $elem;
                        else if (id === "clearAll") self.$btnClear = $elem;
                        else if (id === "reset") self.$btnReset = $elem;
                        else if (id === "openAll") self.$btnOpenAll = $elem;
                        else if (id === "closeAll") self.$btnCloseAll = $elem;
                    };

                    let maxVisible = this.settings.search.enabled ? 3 : 5;
                    let showOverflow = buttons.length > maxVisible;
                    let visibleCount = showOverflow ? maxVisible - 1 : buttons.length;

                    for (let i = 0; i < visibleCount; i++) {
                        let btn = buttons[i];
                        let $btnHtml = $(`
                            <span class="p-2 jq-tree-select-cursor-pointer d-inline-flex align-items-center justify-content-center ${btn.hoverClass}" data-bs-toggle="tooltip" data-bs-placement="top" title="${btn.title}">
                                ${btn.iconSvg}
                            </span>
                        `);
                        $actionsWrapper.append($btnHtml);
                        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                            new bootstrap.Tooltip($btnHtml[0]);
                        }

                        saveBtnReference(btn.id, $btnHtml);

                        $btnHtml.on("click", function () {
                            if ($btnHtml.hasClass("jq-tree-select-action-disabled")) return;
                            btn.action($btnHtml);
                            if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                                let tooltip = bootstrap.Tooltip.getInstance(this);
                                if (tooltip && typeof tooltip.hide === "function") tooltip.hide();
                            }
                        });
                    }

                    if (showOverflow) {
                        let $menuWrapper = $(`
                            <div class="dropdown jq-tree-select-overflow-menu" data-bs-toggle="tooltip" data-bs-placement="top" title="More Actions">
                                <span class="p-2 jq-tree-select-cursor-pointer d-inline-flex align-items-center justify-content-center jq-tree-select-text-hover-primary" data-bs-toggle="dropdown" aria-expanded="false">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                                </span>
                                <ul class="dropdown-menu dropdown-menu-end shadow p-1 mt-1" style="font-size: 0.85rem; min-width: 150px; z-index: 1050;">
                                </ul>
                            </div>
                        `);
                        $actionsWrapper.append($menuWrapper);
                        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                            new bootstrap.Tooltip($menuWrapper[0]);
                        }

                        let $menuList = $menuWrapper.find(".dropdown-menu");
                        let $dropdownToggle = $menuWrapper.find('[data-bs-toggle="dropdown"]');

                        $dropdownToggle.on("click", function (e) {
                            if (typeof bootstrap === 'undefined' || !bootstrap.Dropdown) {
                                e.preventDefault();
                                e.stopPropagation();
                                $menuList.toggleClass("show");
                            }
                        });

                        $(document).on("click", function (e) {
                            if (!$menuWrapper.is(e.target) && $menuWrapper.has(e.target).length === 0) {
                                $menuList.removeClass("show");
                            }
                        });

                        for (let i = visibleCount; i < buttons.length; i++) {
                            let btn = buttons[i];
                            let $item = $(`
                                <li>
                                    <a class="dropdown-item d-flex align-items-center gap-2 py-2" href="#">
                                        <span class="text-secondary d-inline-flex align-items-center justify-content-center" style="width: 16px;">
                                            ${btn.iconSvg}
                                        </span>
                                        <span>${btn.title}</span>
                                    </a>
                                </li>
                            `);
                            $menuList.append($item);

                            let $btnLink = $item.find("a");
                            saveBtnReference(btn.id, $btnLink);

                            $btnLink.on("click", function (e) {
                                e.preventDefault();
                                if ($btnLink.hasClass("jq-tree-select-action-disabled")) return;
                                btn.action($btnLink);
                            });
                        }
                    }

                    $btnGroup.append($actionsWrapper);
                }

                this.$dropdown.append($btnGroup);
            }

            if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                this.displayTooltip = new bootstrap.Tooltip(this.$display[0], {
                    title: () => {
                        return this.$selectedText.text();
                    },
                    trigger: "hover",
                    placement: "top",
                });
            }

            this.$display.on("show.bs.tooltip", (e) => {
                let el = this.$selectedText[0];
                let isDropdownOpen = this.$dropdown.hasClass("show");
                if (
                    isDropdownOpen ||
                    this.$selectedText.is(":hidden") ||
                    el.scrollWidth <= el.clientWidth
                ) {
                    e.preventDefault();
                }
            });

            if (this.totalOptions === 0) {
                this.$notFound.text("No options available").show();
            }

            if (this.settings.grouping.nested) {
                let tree = {
                    children: {},
                    options: []
                };

                let self = this;
                $originalSelect.find("option").each(function () {
                    let valAttr = $(this).attr("value");
                    if (
                        valAttr === undefined ||
                        valAttr === null ||
                        valAttr === ""
                    ) {
                        return;
                    }

                    let namesPath = [];
                    let idsPath = [];

                    let groupPath = $(this).data("group-path");
                    if (groupPath) {
                        namesPath = groupPath.split("/").map(s => s.trim()).filter(Boolean);
                        let idPathAttr = $(this).data("group-id-path");
                        if (idPathAttr) {
                            idsPath = idPathAttr.split("/").map(s => s.trim()).filter(Boolean);
                        } else {
                            idsPath = namesPath.map(name => name.toLowerCase().replace(/[^a-z0-9_-]/g, "_"));
                        }
                    } else {
                        let gName = $(this).data("group-name");
                        let gId = $(this).data("group-id");
                        let sgName = $(this).data("subgroup-name");
                        let sgId = $(this).data("subgroup-id");

                        if (gName || gId) {
                            let name = gName || "Other";
                            let id = gId || name.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
                            namesPath.push(name);
                            idsPath.push(id);

                            if (sgName || sgId) {
                                let subName = sgName || "";
                                  let subId = sgId || subName.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
                                namesPath.push(subName);
                                idsPath.push(subId);
                            }
                        } else {
                            // Fallback to parent optgroup element if present
                            let $parentOptgroup = $(this).parent("optgroup");
                            if ($parentOptgroup.length > 0) {
                                let label = $parentOptgroup.attr("label") || "Other";
                                let id = $parentOptgroup.attr("id") || label.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
                                namesPath.push(label);
                                idsPath.push(id);
                                
                                // Support nested optgroups if any (standard HTML doesn't support nested optgroups, but some configurations do)
                                let $grandparentOptgroup = $parentOptgroup.parent("optgroup");
                                if ($grandparentOptgroup.length > 0) {
                                    let grandLabel = $grandparentOptgroup.attr("label") || "Other";
                                    let grandId = $grandparentOptgroup.attr("id") || grandLabel.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
                                    namesPath.unshift(grandLabel);
                                    idsPath.unshift(grandId);
                                }
                            }
                        }
                    }

                    let current = tree;
                    let currentIdPath = "";
                    for (let i = 0; i < namesPath.length; i++) {
                        let name = namesPath[i];
                        let id = idsPath[i] || name.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
                        currentIdPath = currentIdPath ? currentIdPath + "_" + id : id;

                        if (!current.children[id]) {
                            current.children[id] = {
                                id: id,
                                name: name,
                                fullIdPath: currentIdPath,
                                checkboxId: "grp_" + Math.random().toString(36).substr(2, 9),
                                children: {},
                                options: [],
                                collapsed: self.settings.grouping.collapsedByDefault
                            };
                        }

                        let optCollapsed = $(this).data("group-collapsed");
                        if (optCollapsed !== undefined && optCollapsed !== null) {
                            current.children[id].collapsed = (optCollapsed === true || optCollapsed === "true");
                        }

                        current = current.children[id];
                    }

                    current.options.push($(this));
                });

                function renderOption($optTag, parentIdPath) {
                    let val = $optTag.val();
                    let text = $optTag.text();
                    let isChecked = $optTag.is(":selected") ? "checked" : "";
                    let isDisabled = $optTag.is(":disabled") ? "disabled" : "";
                    let disabledClass = isDisabled ? "jq-tree-select-option-disabled" : "";
                    let uid = "opt_" + Math.random().toString(36).substr(2, 9);

                    return $(`
                        <div class="jq-tree-select-option py-2 px-2 m-0 jq-tree-select-node ${disabledClass}">
                            <div class="form-check m-0">
                                <input class="form-check-input select-checkbox" type="checkbox" value="${val}" id="${uid}" data-parent-path="${parentIdPath}" ${isChecked} ${isDisabled}>
                                <label class="form-check-label w-100" for="${uid}" style="cursor:${isDisabled ? 'not-allowed' : 'pointer'};">${text}</label>
                            </div>
                        </div>
                    `);
                }

                function renderNode(node, depth) {
                    let isCollapsed = self.settings.grouping.collapsible && node.collapsed;
                    let toggleIconClass = isCollapsed ? "collapsed" : "expanded";
                    let childrenStyle = isCollapsed ? 'style="display: none;"' : "";
                    
                    let toggleIconHtml = self.settings.grouping.collapsible 
                        ? `<span class="jq-tree-select-group-toggle jq-tree-select-cursor-pointer me-2 ${toggleIconClass}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></span>` 
                        : "";

                    // Check if all options in this node are disabled
                    let hasEnabledOptions = false;
                    let checkEnabled = (n) => {
                        if (n.options.some(o => !o.is(":disabled"))) {
                            hasEnabledOptions = true;
                            return;
                        }
                        for (let key in n.children) {
                            checkEnabled(n.children[key]);
                            if (hasEnabledOptions) return;
                        }
                    };
                    checkEnabled(node);
                    let isNodeDisabled = !hasEnabledOptions && node.options.length > 0;
                    let nodeDisabledAttr = isNodeDisabled ? "disabled" : "";
                    let nodeDisabledClass = isNodeDisabled ? "jq-tree-select-option-disabled" : "";

                    if (depth === 1) {
                        let $groupWrapper = $('<div class="jq-tree-select-group-wrapper mb-2"></div>');
                        let $groupHeader = $(`
                            <div class="dropdown-header jq-tree-select-group-header px-2 py-2 d-flex align-items-center ${nodeDisabledClass}">
                                ${toggleIconHtml}
                                <div class="form-check m-0 flex-grow-1">
                                    <input class="form-check-input group-checkbox" type="checkbox" id="${node.checkboxId}" data-full-path="${node.fullIdPath}" ${nodeDisabledAttr}>
                                    <label class="form-check-label w-100 fw-bold" for="${node.checkboxId}" style="cursor:${isNodeDisabled ? 'not-allowed' : 'pointer'};">${node.name}</label>
                                </div>
                            </div>
                        `);
                        $groupWrapper.append($groupHeader);

                        let $childrenContainer = $(`<div class="jq-tree-select-children" ${childrenStyle} data-default-collapsed="${isCollapsed}"></div>`);
                        
                        for (let subId in node.children) {
                            $childrenContainer.append(renderNode(node.children[subId], depth + 1));
                        }

                        node.options.forEach(function ($optTag) {
                            $childrenContainer.append(renderOption($optTag, node.fullIdPath));
                        });

                        $groupWrapper.append($childrenContainer);
                        return $groupWrapper;
                    } else {
                        let $subgroupWrapper = $('<div class="jq-tree-select-subgroup-wrapper jq-tree-select-node"></div>');
                        let $subgroupHeader = $(`
                            <div class="dropdown-header jq-tree-select-subgroup-header px-2 py-2 d-flex align-items-center ${nodeDisabledClass}">
                                ${toggleIconHtml}
                                <div class="form-check m-0 flex-grow-1">
                                    <input class="form-check-input group-checkbox" type="checkbox" id="${node.checkboxId}" data-full-path="${node.fullIdPath}" ${nodeDisabledAttr}>
                                    <label class="form-check-label w-100 fw-bold" for="${node.checkboxId}" style="cursor:${isNodeDisabled ? 'not-allowed' : 'pointer'};">
                                        ${node.name}
                                    </label>
                                </div>
                            </div>
                        `);
                        $subgroupWrapper.append($subgroupHeader);

                        let $childrenContainer = $(`<div class="jq-tree-select-children" ${childrenStyle} data-default-collapsed="${isCollapsed}"></div>`);

                        for (let subId in node.children) {
                            $childrenContainer.append(renderNode(node.children[subId], depth + 1));
                        }

                        node.options.forEach(function ($optTag) {
                            $childrenContainer.append(renderOption($optTag, node.fullIdPath));
                        });

                        $subgroupWrapper.append($childrenContainer);
                        return $subgroupWrapper;
                    }
                }

                for (let gId in tree.children) {
                    this.$optionsContainer.append(renderNode(tree.children[gId], 1));
                }
                
                tree.options.forEach(function ($optTag) {
                    self.$optionsContainer.append(renderOption($optTag, ""));
                });
            } else {
                let self = this;
                $originalSelect.find("option").each(function () {
                    let valAttr = $(this).attr("value");
                    if (
                        valAttr === undefined ||
                        valAttr === null ||
                        valAttr === ""
                    ) {
                        return;
                    }
                    let val = $(this).val();
                    let text = $(this).text();
                    let isChecked = $(this).is(":selected") ? "checked" : "";
                    let isDisabled = $(this).is(":disabled") ? "disabled" : "";
                    let disabledClass = isDisabled ? "jq-tree-select-option-disabled" : "";
                    let uid = "opt_" + Math.random().toString(36).substr(2, 9);

                    let $opt = $(`
                        <div class="jq-tree-select-option mb-1 py-2 px-2 m-0 ${disabledClass}">
                            <div class="form-check m-0 ms-1">
                                <input class="form-check-input select-checkbox" type="checkbox" value="${val}" id="${uid}" ${isChecked} ${isDisabled}>
                                <label class="form-check-label w-100" for="${uid}" style="cursor:${isDisabled ? 'not-allowed' : 'pointer'};">${text}</label>
                            </div>
                        </div>
                    `);
                    self.$optionsContainer.append($opt);
                });
            }

            this.$dropdown.append(this.$optionsContainer);
            this.$dropdown.append(this.$notFound);

            this.$display.append(this.$placeholder, this.$selectedText, this.$countBadge, this.$chevron);
            this.$wrapper.append(this.$display, this.$dropdown);
            $originalSelect.after(this.$wrapper);

            this.$display.on("click", () => {
                if (this.isDisabled) return;
                let isOpen = this.$dropdown.hasClass("show");
                if (isOpen) {
                    this.closeDropdown();
                } else {
                    this.openDropdown();
                }
            });

            this.docClickEvent =
                "click.jqtreeselect-" + Math.random().toString(36).substr(2, 9);
            $(document).on(this.docClickEvent, (e) => {
                if (
                    !this.$wrapper.is(e.target) &&
                    this.$wrapper.has(e.target).length === 0
                ) {
                    this.closeDropdown();
                }
            });

            this.$optionsContainer.on("click", ".jq-tree-select-group-toggle", (e) => {
                e.stopPropagation();
                let $toggle = $(e.currentTarget);
                let $header = $toggle.closest(".jq-tree-select-group-header, .jq-tree-select-subgroup-header");
                let $children = $header.next(".jq-tree-select-children");

                let isCollapsed = $children.is(":hidden");
                if (isCollapsed) {
                    $children.show();
                    $toggle.removeClass("collapsed").addClass("expanded");
                } else {
                    $children.hide();
                    $toggle.removeClass("expanded").addClass("collapsed");
                }
                this.updateHeaderButtons();
            });

            this.$optionsContainer.on(
                "click",
                ".jq-tree-select-group-header, .jq-tree-select-subgroup-header, .jq-tree-select-option",
                (e) => {
                    if (this.isDisabled) return;
                    let $target = $(e.target);
                    if (
                        $target.is('input[type="checkbox"]') ||
                        $target.is("label") ||
                        $target.hasClass("jq-tree-select-group-toggle")
                    ) {
                        return;
                    }

                    let $row = $(e.currentTarget);
                    if ($row.hasClass("jq-tree-select-group-header") || $row.hasClass("jq-tree-select-subgroup-header")) {
                        if (this.settings.grouping.collapsible) {
                            $row.find(".jq-tree-select-group-toggle").trigger("click");
                            return;
                        }
                    }

                    let $checkbox = $row
                        .find('input[type="checkbox"]:not(:disabled)')
                        .first();
                    if ($checkbox.length) {
                        $checkbox
                            .prop("checked", !$checkbox.prop("checked"))
                            .trigger("change");
                    }
                },
            );

            this.$optionsContainer.on("change", ".select-checkbox", (e) => {
                if (this.isDisabled) return;
                this.updateUI($(e.currentTarget));
            });

            this.$optionsContainer.on("change", ".group-checkbox", (e) => {
                if (this.isDisabled) return;
                let $checkbox = $(e.currentTarget);
                let isChecked = $checkbox.prop("checked");
                let $childrenContainer = $checkbox.closest(".jq-tree-select-group-header, .jq-tree-select-subgroup-header").next(".jq-tree-select-children");
                $childrenContainer.find('input[type="checkbox"]:not(:disabled)').prop("checked", isChecked).prop("indeterminate", false);
                this.updateUI($checkbox);
            });

            // Initialize disabled state if set
            this.isDisabled = $originalSelect.is(":disabled") || this.settings.disabled === true;
            if (this.isDisabled) {
                this.disable();
            } else {
                this.updateUI();
            }
            
            // Trigger init callback & event
            $originalSelect.trigger("jqtree:init", [this]);
            if (typeof this.settings.callbacks.onInit === "function") {
                this.settings.callbacks.onInit.call(this.$originalSelect[0], this);
            }
        }

        openDropdown() {
            if (this.isDisabled) return;
            this.$dropdown.addClass("show");
            if (this.displayTooltip && typeof this.displayTooltip.hide === "function") {
                this.displayTooltip.hide();
            }
            
            this.$originalSelect.trigger("jqtree:open", [this]);
            if (typeof this.settings.callbacks.onOpen === "function") {
                this.settings.callbacks.onOpen.call(this.$originalSelect[0], this);
            }

            if (this.settings.search.enabled && this.$searchContainer) {
                setTimeout(() => {
                    this.$searchContainer.find(".jq-tree-select-search-input").focus();
                }, 50);
            }
        }

        closeDropdown() {
            if (!this.$dropdown.hasClass("show")) return;
            this.$dropdown.removeClass("show");
            
            this.$originalSelect.trigger("jqtree:close", [this]);
            if (typeof this.settings.callbacks.onClose === "function") {
                this.settings.callbacks.onClose.call(this.$originalSelect[0], this);
            }
        }

        syncParents($checkbox) {
            let $parentContainer = $checkbox.closest(".jq-tree-select-children");
            if ($parentContainer.length === 0) return;

            let $groupHeader = $parentContainer.prev(".jq-tree-select-group-header, .jq-tree-select-subgroup-header");
            if ($groupHeader.length === 0) return;

            let $parentCheckbox = $groupHeader.find(".group-checkbox");
            if ($parentCheckbox.length === 0) return;

            let $leafCheckboxes = $parentContainer.find(".select-checkbox:not(:disabled)");
            let total = $leafCheckboxes.length;
            let checked = $leafCheckboxes.filter(":checked").length;

            if (total === 0) {
                $parentCheckbox.prop("checked", false).prop("indeterminate", false);
            } else if (checked === total && total > 0) {
                $parentCheckbox.prop("checked", true).prop("indeterminate", false);
            } else if (checked === 0) {
                $parentCheckbox.prop("checked", false).prop("indeterminate", false);
            } else {
                $parentCheckbox.prop("checked", false).prop("indeterminate", true);
            }

            this.syncParents($parentCheckbox);
        }

        syncAllGroups() {
            let $childrenContainers = this.$optionsContainer.find(".jq-tree-select-children");
            $childrenContainers.each(function () {
                let depth = $(this).parents(".jq-tree-select-children").length;
                $(this).data("depth", depth);
            });

            let sortedContainers = $childrenContainers.get().sort((a, b) => {
                return $(b).data("depth") - $(a).data("depth");
            });

            $(sortedContainers).each(function () {
                let $groupHeader = $(this).prev(".jq-tree-select-group-header, .jq-tree-select-subgroup-header");
                if ($groupHeader.length === 0) return;

                let $parentCheckbox = $groupHeader.find(".group-checkbox");
                if ($parentCheckbox.length === 0) return;

                let $leafCheckboxes = $(this).find(".select-checkbox:not(:disabled)");
                let total = $leafCheckboxes.length;
                let checked = $leafCheckboxes.filter(":checked").length;

                if (total === 0) {
                    $parentCheckbox.prop("checked", false).prop("indeterminate", false);
                } else if (checked === total && total > 0) {
                    $parentCheckbox.prop("checked", true).prop("indeterminate", false);
                } else if (checked === 0) {
                    $parentCheckbox.prop("checked", false).prop("indeterminate", false);
                } else {
                    $parentCheckbox.prop("checked", false).prop("indeterminate", true);
                }
            });
        }

        getSmartSelectedText() {
            if (!this.settings.grouping.nested) {
                let selectedTexts = [];
                this.$optionsContainer
                    .find(".select-checkbox:checked")
                    .each(function () {
                        selectedTexts.push(
                            $(this).siblings("label").text().trim(),
                        );
                    });
                return selectedTexts.join(", ");
            }

            let summaryItems = [];

            this.$optionsContainer.children(".jq-tree-select-group-wrapper").each(function () {
                processSummaryNode($(this));
            });

            this.$optionsContainer.children(".jq-tree-select-option").each(function () {
                let $chk = $(this).find(".select-checkbox");
                if ($chk.prop("checked")) {
                    summaryItems.push($(this).find("label").text().trim());
                }
            });

            function processSummaryNode($wrapper) {
                let $checkbox = $wrapper.children(".jq-tree-select-group-header, .jq-tree-select-subgroup-header").find(".group-checkbox");
                if ($checkbox.length && $checkbox.prop("checked") && !$checkbox.prop("indeterminate")) {
                    summaryItems.push($checkbox.siblings("label").text().trim());
                } else {
                    let $childrenContainer = $wrapper.children(".jq-tree-select-children");
                    $childrenContainer.children(".jq-tree-select-subgroup-wrapper").each(function () {
                        processSummaryNode($(this));
                    });
                    $childrenContainer.children(".jq-tree-select-option").each(function () {
                        let $chk = $(this).find(".select-checkbox");
                        if ($chk.prop("checked")) {
                            summaryItems.push($(this).find("label").text().trim());
                        }
                    });
                }
            }

            return summaryItems.join(", ");
        }

        updateHeaderButtons() {
            let query = "";
            if (this.settings.search.enabled && this.$searchContainer) {
                query = this.$searchContainer.find(".jq-tree-select-search-input").val().toLowerCase().trim();
            }

            let $visibleCheckboxes;
            if (query === "") {
                $visibleCheckboxes = this.$optionsContainer.find(".select-checkbox:not(:disabled)");
            } else {
                $visibleCheckboxes = this.$optionsContainer.find(".select-checkbox:visible:not(:disabled)");
            }

            let visibleTotal = $visibleCheckboxes.length;
            let visibleChecked = $visibleCheckboxes.filter(":checked").length;

            if (this.$btnAll) {
                if (visibleTotal === 0 || visibleChecked === visibleTotal) {
                    this.$btnAll.addClass("jq-tree-select-action-disabled");
                    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                        let tooltip = bootstrap.Tooltip.getInstance(this.$btnAll[0]);
                        if (tooltip && typeof tooltip.hide === "function") tooltip.hide();
                    }
                } else {
                    this.$btnAll.removeClass("jq-tree-select-action-disabled");
                }
            }

            if (this.$btnClear) {
                if (visibleTotal === 0 || visibleChecked === 0) {
                    this.$btnClear.addClass("jq-tree-select-action-disabled");
                    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                        let tooltip = bootstrap.Tooltip.getInstance(this.$btnClear[0]);
                        if (tooltip && typeof tooltip.hide === "function") tooltip.hide();
                    }
                } else {
                    this.$btnClear.removeClass("jq-tree-select-action-disabled");
                }
            }

            if (this.$btnReset) {
                let isResetDisabled = true;
                let self = this;
                $visibleCheckboxes.each(function () {
                    let isChecked = $(this).prop("checked");
                    let isDefault = self.defaultSelectedValues.includes($(this).val());
                    if (isChecked !== isDefault) {
                        isResetDisabled = false;
                        return false;
                    }
                });
                if (isResetDisabled) {
                    this.$btnReset.addClass("jq-tree-select-action-disabled");
                    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                        let tooltip = bootstrap.Tooltip.getInstance(this.$btnReset[0]);
                        if (tooltip && typeof tooltip.hide === "function") tooltip.hide();
                    }
                } else {
                    this.$btnReset.removeClass("jq-tree-select-action-disabled");
                }
            }

            if (this.$btnOpenAll) {
                let collapsedCount = this.$optionsContainer.find(".jq-tree-select-children").filter(function() {
                    return this.style.display === "none";
                }).length;
                
                if (!this.settings.grouping.collapsible || collapsedCount === 0) {
                    this.$btnOpenAll.addClass("jq-tree-select-action-disabled");
                    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                        let tooltip = bootstrap.Tooltip.getInstance(this.$btnOpenAll[0]);
                        if (tooltip && typeof tooltip.hide === "function") tooltip.hide();
                    }
                } else {
                    this.$btnOpenAll.removeClass("jq-tree-select-action-disabled");
                }
            }

            if (this.$btnCloseAll) {
                let expandedCount = this.$optionsContainer.find(".jq-tree-select-children").filter(function() {
                    return this.style.display !== "none";
                }).length;

                if (!this.settings.grouping.collapsible || expandedCount === 0) {
                    this.$btnCloseAll.addClass("jq-tree-select-action-disabled");
                    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                        let tooltip = bootstrap.Tooltip.getInstance(this.$btnCloseAll[0]);
                        if (tooltip && typeof tooltip.hide === "function") tooltip.hide();
                    }
                } else {
                    this.$btnCloseAll.removeClass("jq-tree-select-action-disabled");
                }
            }
        }

        updateUI($changedElem) {
            let checkedCount = 0;
            let selectedValues = [];
            
            // Get selected values (both enabled and disabled, to keep full sync)
            this.$optionsContainer
                .find(".select-checkbox:checked")
                .each(function () {
                    checkedCount++;
                    selectedValues.push($(this).val());
                });

            let currentVal = this.$originalSelect.val() || [];
            let valChanged = JSON.stringify(currentVal.sort()) !== JSON.stringify(selectedValues.concat().sort());

            if (valChanged) {
                this.$originalSelect.val(selectedValues).trigger("change");
            }

            if ($changedElem && $changedElem !== true && this.settings.grouping.nested) {
                this.syncParents($changedElem);
            } else if (this.settings.grouping.nested) {
                this.syncAllGroups();
            }

            let $btnAllIcon = this.$wrapper.find(".fa-check-double");
            if ($btnAllIcon.length) {
                let totalEnabledOptions = this.$optionsContainer.find(".select-checkbox:not(:disabled)").length;
                let checkedEnabledOptions = this.$optionsContainer.find(".select-checkbox:checked:not(:disabled)").length;
                if (checkedEnabledOptions === totalEnabledOptions && totalEnabledOptions > 0) {
                    $btnAllIcon.addClass("text-primary");
                } else {
                    $btnAllIcon.removeClass("text-primary");
                }
            }

            if (checkedCount > 0) {
                this.$placeholder.hide();
                let smartText = this.getSmartSelectedText();
                this.$selectedText.text(smartText).show();
                this.$countBadge.text(checkedCount).show();
            } else {
                this.$placeholder.show();
                this.$selectedText.hide();
                this.$countBadge.hide();
            }

            this.updateHeaderButtons();

            // Trigger change event & callback
            if ($changedElem) {
                let detail = {
                    instance: this,
                    selectedValues: selectedValues,
                    changedElement: $changedElem === true ? null : $changedElem
                };
                this.$originalSelect.trigger("jqtree:change", [detail]);
                if (typeof this.settings.callbacks.onChange === "function") {
                    this.settings.callbacks.onChange.call(this.$originalSelect[0], detail);
                }
            }
        }

        // --- Public API Methods ---
        val(values) {
            if (values === undefined) {
                return this.$originalSelect.val();
            }
            let valuesStr = values.map(v => v.toString());
            this.$optionsContainer.find(".select-checkbox").each(function () {
                let isChecked = valuesStr.includes($(this).val().toString());
                $(this).prop("checked", isChecked);
            });
            this.updateUI(true);
            return this.$originalSelect;
        }

        selectAll() {
            if (this.isDisabled) return;
            this.$optionsContainer.find(".select-checkbox:not(:disabled)").prop("checked", true);
            this.updateUI(true);
        }

        clear() {
            if (this.isDisabled) return;
            this.$optionsContainer.find(".select-checkbox:not(:disabled)").prop("checked", false);
            this.updateUI(true);
        }

        reset() {
            if (this.isDisabled) return;
            this.$optionsContainer.find(".select-checkbox:not(:disabled)").each((index, el) => {
                let isDefault = this.defaultSelectedValues.includes($(el).val().toString());
                $(el).prop("checked", isDefault);
            });
            this.updateUI(true);
        }

        expandAll() {
            if (this.isDisabled) return;
            if (this.settings.grouping.collapsible) {
                this.$optionsContainer.find(".jq-tree-select-children").show();
                this.$optionsContainer.find(".jq-tree-select-group-toggle").removeClass("fa-chevron-right").addClass("fa-chevron-down");
                this.updateUI(true);
            }
        }

        collapseAll() {
            if (this.isDisabled) return;
            if (this.settings.grouping.collapsible) {
                this.$optionsContainer.find(".jq-tree-select-children").hide();
                this.$optionsContainer.find(".jq-tree-select-group-toggle").removeClass("fa-chevron-down").addClass("fa-chevron-right");
                this.updateUI(true);
            }
        }

        enable() {
            this.isDisabled = false;
            this.$originalSelect.prop("disabled", false);
            this.$wrapper.removeClass("jq-tree-select-disabled");
            this.$display.removeClass("disabled");
        }

        disable() {
            this.isDisabled = true;
            this.$originalSelect.prop("disabled", true);
            this.closeDropdown();
            this.$wrapper.addClass("jq-tree-select-disabled");
            this.$display.addClass("disabled");
        }

        refresh() {
            this.destroy();
            this.init();
        }

        destroy() {
            if (this.$wrapper) {
                if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                    this.$wrapper.find('[data-bs-toggle="tooltip"]').each(function () {
                        let t = bootstrap.Tooltip.getInstance(this);
                        if (t && typeof t.dispose === "function") t.dispose();
                    });
                    let $oldDisplay = this.$wrapper.find(".jq-tree-select-display");
                    if ($oldDisplay.length) {
                        let t = bootstrap.Tooltip.getInstance($oldDisplay[0]);
                        if (t && typeof t.dispose === "function") t.dispose();
                    }
                }
                this.$wrapper.remove();
            }

            if (this.docClickEvent) {
                $(document).off(this.docClickEvent);
            }

            this.$originalSelect.removeData("jq-tree-select");
            this.$originalSelect.show();
            
            this.$originalSelect.trigger("jqtree:destroy", [this]);
            if (typeof this.settings.callbacks.onDestroy === "function") {
                this.settings.callbacks.onDestroy.call(this.$originalSelect[0], this);
            }
        }
    }

    // jQuery Plugin Definition
    $.fn.jqTreeSelect = function (options, ...args) {
        if (typeof options === "string") {
            let method = options;
            let returns = null;

            this.each(function () {
                let instance = $.data(this, "jq-tree-select");
                if (instance instanceof JqTreeSelect && typeof instance[method] === "function") {
                    let result = instance[method](...args);
                    if (method === "val" && args.length === 0) {
                        returns = result;
                    }
                }
            });

            return returns !== null ? returns : this;
        }

        return this.each(function () {
            let instance = $.data(this, "jq-tree-select");
            if (instance) {
                instance.destroy();
            }
            $.data(this, "jq-tree-select", new JqTreeSelect(this, options));
        });
    };

    // Global Defaults (nested structure)
    $.fn.jqTreeSelect.defaults = {
        layout: {
            width: "100%",
            height: "36px",
            dropdownHeight: "400px",
            placeholder: "Select...",
        },
        actions: {
            showSelectAll: true,
            showClearAll: true,
            showReset: false,
            showTotalCount: false,
        },
        grouping: {
            nested: false,
            collapsible: false,
            collapsedByDefault: false,
            showExpandAll: false,
            showCollapseAll: false,
        },
        search: {
            enabled: false,
            placeholder: "Search...",
        },
        data: null,
        disabled: false,
        callbacks: {
            onInit: null,
            onOpen: null,
            onClose: null,
            onChange: null,
            onDestroy: null
        }
    };

    // Expose constructor on prototype for extension access
    $.fn.jqTreeSelect.Constructor = JqTreeSelect;

    // noConflict implementation
    let old = $.fn.jqTreeSelect;
    $.fn.jqTreeSelect.noConflict = function () {
        $.fn.jqTreeSelect = old;
        return this;
    };

    // Auto-Init Data API
    $(function () {
        $('select[data-toggle="jq-tree-select"]').each(function () {
            let $select = $(this);
            $select.jqTreeSelect();
        });
    });
}));
