/**
 * WI3BIT Custom Multi-Select Dropdown Plugin
 * Version: 1.2.0
 * Description: A dynamic, searchable, grouped, tree-nesting multi-select plugin.
 * Production-ready with nested parameters, global defaults, data-attribute configuration,
 * programmatic data-loading, disabled states support, and lifecycle events/callbacks.
 */
(function ($) {
    class Wi3bitMultiSelect {
        constructor(element, options) {
            this.$originalSelect = $(element);
            
            // Normalize and merge options
            let dataOpts = this._parseDataAttributes(this.$originalSelect);
            let normalizedOpts = this._normalizeOptions(options);
            
            this.settings = $.extend(
                true, 
                {}, 
                $.fn.wi3bitMultiSelect.defaults, 
                dataOpts, 
                normalizedOpts
            );
            
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

            $originalSelect.data("wi3bit-multi-select-wrapper", this.$wrapper);

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
                '<div class="wi3bit-multi-select position-relative"></div>',
            );
            if (this.settings.layout.width) {
                this.$wrapper.css("width", this.settings.layout.width);
            }

            let requiredClasses = ["form-select", "wi3bit-select-display"];
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
                `<span class="text-muted placeholder-text"><i class="fa-solid fa-list-check me-2"></i>${pText}</span>`,
            );
            this.$selectedText = $(
                '<span class="wi3bit-selected-text" style="display:none;"></span>',
            );
            this.$countBadge = $(
                '<span class="badge bg-primary rounded-pill wi3bit-select-badge text-white" style="display:none;"></span>',
            );
            this.$chevron = $(
                '<i class="fa-solid fa-chevron-down position-absolute wi3bit-select-chevron"></i>',
            );

            this.$dropdown = $(
                '<div class="dropdown-menu shadow p-2 mt-1 w-100"></div>',
            );
            if (this.settings.layout.dropdownHeight) {
                this.$dropdown.css("max-height", this.settings.layout.dropdownHeight);
            }

            this.$optionsContainer = $("<div></div>");
            this.$notFound = $(
                '<div class="wi3bit-not-found text-muted text-center" style="display:none;"><i class="fa-solid fa-triangle-exclamation me-2"></i>No matches found</div>',
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
                    '<div class="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom wi3bit-action-header"></div>',
                );

                if (this.settings.search.enabled) {
                    let sPlaceholder = this.settings.search.placeholder || "Search...";
                    this.$searchContainer = $(`
                        <div class="wi3bit-search-container flex-grow-1">
                            <div class="input-group input-group-sm">
                                <span class="input-group-text bg-transparent border-end-0 text-muted" style="border-color: var(--bs-gray-200); padding: 0.25rem 0.5rem;"><i class="fa-solid fa-magnifying-glass"></i></span>
                                <input type="text" class="form-control border-start-0 wi3bit-search-input ps-0" placeholder="${sPlaceholder}" style="border-color: var(--bs-gray-200); font-size: 0.82rem; height: 30px;">
                            </div>
                        </div>
                    `);
                    $btnGroup.append(this.$searchContainer);

                    let $searchInput = this.$searchContainer.find(
                        ".wi3bit-search-input",
                    );
                    $searchInput.on("input", () => {
                        let query = $searchInput.val().toLowerCase().trim();
                        if (query === "") {
                            this.$optionsContainer
                                .find(
                                    ".wi3bit-group-wrapper, .wi3bit-group-header, .wi3bit-subgroup-wrapper, .wi3bit-subgroup-header, .wi3bit-select-option",
                                )
                                .show();
                            if (this.settings.grouping.collapsible) {
                                this.$optionsContainer.find(".wi3bit-tree-children").each(function () {
                                    let defCollapsed = $(this).data("default-collapsed") === true;
                                    let $toggle = $(this).prev(".wi3bit-group-header, .wi3bit-subgroup-header").find(".wi3bit-group-toggle");
                                    if (defCollapsed) {
                                        $(this).hide();
                                        $toggle.removeClass("fa-chevron-down").addClass("fa-chevron-right");
                                    } else {
                                        $(this).show();
                                        $toggle.removeClass("fa-chevron-right").addClass("fa-chevron-down");
                                    }
                                });
                            }
                            this.$notFound.hide();
                        } else {
                            this.$optionsContainer
                                .find(
                                    ".wi3bit-group-wrapper, .wi3bit-group-header, .wi3bit-subgroup-wrapper, .wi3bit-subgroup-header, .wi3bit-select-option",
                                )
                                .hide();
                            let self = this;
                            this.$optionsContainer
                                .find(".wi3bit-select-option")
                                .each(function () {
                                    let optionText = $(this)
                                        .find("label")
                                        .text()
                                        .toLowerCase();
                                    if (optionText.indexOf(query) > -1) {
                                        $(this).show();
                                        let $ancestors = $(this).parents(".wi3bit-subgroup-wrapper, .wi3bit-group-wrapper");
                                        $ancestors.show();
                                        $ancestors.children(".wi3bit-subgroup-header, .wi3bit-group-header").show();
                                        if (self.settings.grouping.collapsible) {
                                            let $childrenContainers = $ancestors.children(".wi3bit-tree-children");
                                            $childrenContainers.show();
                                            $ancestors.children(".wi3bit-group-header, .wi3bit-subgroup-header")
                                                .find(".wi3bit-group-toggle")
                                                .removeClass("fa-chevron-right")
                                                .addClass("fa-chevron-down");
                                        }
                                    }
                                });

                            let visibleOptions = this.$optionsContainer.find(
                                ".wi3bit-select-option:visible",
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
                        '<div class="d-flex gap-1 align-items-center"></div>',
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
                            `<span class="badge bg-light text-dark border me-1 small wi3bit-total-options-badge" data-bs-toggle="tooltip" title="Total Options">${this.totalOptions}</span>`,
                        );
                        $actionsWrapper.append($totalBadge);
                        new bootstrap.Tooltip($totalBadge[0]);
                    }

                    let buttons = [];
                    let self = this;

                    if (this.settings.actions.showSelectAll) {
                        buttons.push({
                            id: "selectAll",
                            title: "Select All",
                            icon: "fa-check-double",
                            hoverClass: "wi3bit-text-hover-primary",
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
                            icon: "fa-xmark",
                            hoverClass: "wi3bit-text-hover-danger",
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
                            icon: "fa-arrow-rotate-left",
                            hoverClass: "wi3bit-text-hover-primary",
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
                            icon: "fa-angles-down",
                            hoverClass: "wi3bit-text-hover-primary",
                            action: () => {
                                self.$optionsContainer.find(".wi3bit-tree-children").show();
                                self.$optionsContainer.find(".wi3bit-group-toggle").removeClass("fa-chevron-right").addClass("fa-chevron-down");
                                self.updateUI(true);
                            }
                        });
                    }
                    if (this.settings.grouping.collapsible && this.settings.grouping.showCollapseAll) {
                        buttons.push({
                            id: "closeAll",
                            title: "Collapse All",
                            icon: "fa-angles-up",
                            hoverClass: "wi3bit-text-hover-danger",
                            action: () => {
                                self.$optionsContainer.find(".wi3bit-tree-children").hide();
                                self.$optionsContainer.find(".wi3bit-group-toggle").removeClass("fa-chevron-down").addClass("fa-chevron-right");
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
                            <span class="p-2" data-bs-toggle="tooltip" data-bs-placement="top" title="${btn.title}">
                                <i class="fa-solid ${btn.icon} wi3bit-cursor-pointer ${btn.hoverClass}"></i>
                            </span>
                        `);
                        $actionsWrapper.append($btnHtml);
                        new bootstrap.Tooltip($btnHtml[0]);

                        saveBtnReference(btn.id, $btnHtml);

                        $btnHtml.on("click", function () {
                            if ($btnHtml.hasClass("wi3bit-action-disabled")) return;
                            btn.action($btnHtml);
                            let tooltip = bootstrap.Tooltip.getInstance(this);
                            if (tooltip) tooltip.hide();
                        });
                    }

                    if (showOverflow) {
                        let $menuWrapper = $(`
                            <div class="dropdown wi3bit-overflow-menu" data-bs-toggle="tooltip" data-bs-placement="top" title="More Actions">
                                <span class="p-2 wi3bit-cursor-pointer" data-bs-toggle="dropdown" aria-expanded="false">
                                    <i class="fa-solid fa-ellipsis-vertical wi3bit-text-hover-primary"></i>
                                </span>
                                <ul class="dropdown-menu dropdown-menu-end shadow p-1 mt-1" style="font-size: 0.85rem; min-width: 150px; z-index: 1050;">
                                </ul>
                            </div>
                        `);
                        $actionsWrapper.append($menuWrapper);
                        new bootstrap.Tooltip($menuWrapper[0]);

                        let $menuList = $menuWrapper.find(".dropdown-menu");

                        for (let i = visibleCount; i < buttons.length; i++) {
                            let btn = buttons[i];
                            let $item = $(`
                                <li>
                                    <a class="dropdown-item d-flex align-items-center gap-2 py-2" href="#">
                                        <i class="fa-solid ${btn.icon} text-secondary" style="width: 16px;"></i>
                                        <span>${btn.title}</span>
                                    </a>
                                </li>
                            `);
                            $menuList.append($item);

                            let $btnLink = $item.find("a");
                            saveBtnReference(btn.id, $btnLink);

                            $btnLink.on("click", function (e) {
                                e.preventDefault();
                                if ($btnLink.hasClass("wi3bit-action-disabled")) return;
                                btn.action($btnLink);
                            });
                        }
                    }

                    $btnGroup.append($actionsWrapper);
                }

                this.$dropdown.append($btnGroup);
            }

            this.displayTooltip = new bootstrap.Tooltip(this.$display[0], {
                title: () => {
                    return this.$selectedText.text();
                },
                trigger: "hover",
                placement: "top",
            });

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
                    let disabledClass = isDisabled ? "wi3bit-option-disabled" : "";
                    let uid = "opt_" + Math.random().toString(36).substr(2, 9);

                    return $(`
                        <div class="wi3bit-select-option py-2 px-2 m-0 wi3bit-tree-node ${disabledClass}">
                            <div class="form-check m-0">
                                <input class="form-check-input select-checkbox" type="checkbox" value="${val}" id="${uid}" data-parent-path="${parentIdPath}" ${isChecked} ${isDisabled}>
                                <label class="form-check-label w-100" for="${uid}" style="cursor:${isDisabled ? 'not-allowed' : 'pointer'};">${text}</label>
                            </div>
                        </div>
                    `);
                }

                function renderNode(node, depth) {
                    let isCollapsed = self.settings.grouping.collapsible && node.collapsed;
                    let toggleIconClass = isCollapsed ? "fa-chevron-right" : "fa-chevron-down";
                    let childrenStyle = isCollapsed ? 'style="display: none;"' : "";
                    
                    let toggleIconHtml = self.settings.grouping.collapsible 
                        ? `<i class="fa-solid ${toggleIconClass} me-2 wi3bit-group-toggle wi3bit-cursor-pointer"></i>` 
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
                    let nodeDisabledClass = isNodeDisabled ? "wi3bit-option-disabled" : "";

                    if (depth === 1) {
                        let $groupWrapper = $('<div class="wi3bit-group-wrapper mb-2"></div>');
                        let $groupHeader = $(`
                            <div class="dropdown-header wi3bit-group-header px-2 py-2 d-flex align-items-center ${nodeDisabledClass}">
                                ${toggleIconHtml}
                                <div class="form-check m-0 flex-grow-1">
                                    <input class="form-check-input group-checkbox" type="checkbox" id="${node.checkboxId}" data-full-path="${node.fullIdPath}" ${nodeDisabledAttr}>
                                    <label class="form-check-label w-100 fw-bold" for="${node.checkboxId}" style="cursor:${isNodeDisabled ? 'not-allowed' : 'pointer'};">${node.name}</label>
                                </div>
                            </div>
                        `);
                        $groupWrapper.append($groupHeader);

                        let $childrenContainer = $(`<div class="wi3bit-tree-children" ${childrenStyle} data-default-collapsed="${isCollapsed}"></div>`);
                        
                        for (let subId in node.children) {
                            $childrenContainer.append(renderNode(node.children[subId], depth + 1));
                        }

                        node.options.forEach(function ($optTag) {
                            $childrenContainer.append(renderOption($optTag, node.fullIdPath));
                        });

                        $groupWrapper.append($childrenContainer);
                        return $groupWrapper;
                    } else {
                        let $subgroupWrapper = $('<div class="wi3bit-subgroup-wrapper wi3bit-tree-node"></div>');
                        let $subgroupHeader = $(`
                            <div class="dropdown-header wi3bit-subgroup-header px-2 py-2 d-flex align-items-center ${nodeDisabledClass}">
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

                        let $childrenContainer = $(`<div class="wi3bit-tree-children" ${childrenStyle} data-default-collapsed="${isCollapsed}"></div>`);

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
                    let disabledClass = isDisabled ? "wi3bit-option-disabled" : "";
                    let uid = "opt_" + Math.random().toString(36).substr(2, 9);

                    let $opt = $(`
                        <div class="wi3bit-select-option mb-1 py-2 px-2 m-0 ${disabledClass}">
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
                "click.wi3bit-" + Math.random().toString(36).substr(2, 9);
            $(document).on(this.docClickEvent, (e) => {
                if (
                    !this.$wrapper.is(e.target) &&
                    this.$wrapper.has(e.target).length === 0
                ) {
                    this.closeDropdown();
                }
            });

            this.$optionsContainer.on("click", ".wi3bit-group-toggle", (e) => {
                e.stopPropagation();
                let $toggle = $(e.currentTarget);
                let $header = $toggle.closest(".wi3bit-group-header, .wi3bit-subgroup-header");
                let $children = $header.next(".wi3bit-tree-children");

                let isCollapsed = $children.is(":hidden");
                if (isCollapsed) {
                    $children.show();
                    $toggle.removeClass("fa-chevron-right").addClass("fa-chevron-down");
                } else {
                    $children.hide();
                    $toggle.removeClass("fa-chevron-down").addClass("fa-chevron-right");
                }
                this.updateHeaderButtons();
            });

            this.$optionsContainer.on(
                "click",
                ".wi3bit-group-header, .wi3bit-subgroup-header, .wi3bit-select-option",
                (e) => {
                    if (this.isDisabled) return;
                    let $target = $(e.target);
                    if (
                        $target.is('input[type="checkbox"]') ||
                        $target.is("label") ||
                        $target.hasClass("wi3bit-group-toggle")
                    ) {
                        return;
                    }

                    let $row = $(e.currentTarget);
                    if ($row.hasClass("wi3bit-group-header") || $row.hasClass("wi3bit-subgroup-header")) {
                        if (this.settings.grouping.collapsible) {
                            $row.find(".wi3bit-group-toggle").trigger("click");
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
                let $childrenContainer = $checkbox.closest(".wi3bit-group-header, .wi3bit-subgroup-header").next(".wi3bit-tree-children");
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
            $originalSelect.trigger("wi3bit:init", [this]);
            if (typeof this.settings.callbacks.onInit === "function") {
                this.settings.callbacks.onInit.call(this.$originalSelect[0], this);
            }
        }

        openDropdown() {
            if (this.isDisabled) return;
            this.$dropdown.addClass("show");
            this.displayTooltip.hide();
            
            this.$originalSelect.trigger("wi3bit:open", [this]);
            if (typeof this.settings.callbacks.onOpen === "function") {
                this.settings.callbacks.onOpen.call(this.$originalSelect[0], this);
            }

            if (this.settings.search.enabled && this.$searchContainer) {
                setTimeout(() => {
                    this.$searchContainer.find(".wi3bit-search-input").focus();
                }, 50);
            }
        }

        closeDropdown() {
            if (!this.$dropdown.hasClass("show")) return;
            this.$dropdown.removeClass("show");
            
            this.$originalSelect.trigger("wi3bit:close", [this]);
            if (typeof this.settings.callbacks.onClose === "function") {
                this.settings.callbacks.onClose.call(this.$originalSelect[0], this);
            }
        }

        syncParents($elem) {
            let $parentContainer = $elem.closest(".wi3bit-tree-children");
            if ($parentContainer.length === 0) return;

            let $parentHeader = $parentContainer.prev(".wi3bit-group-header, .wi3bit-subgroup-header");
            if ($parentHeader.length === 0) return;

            let $parentCheckbox = $parentHeader.find(".group-checkbox");
            if ($parentCheckbox.length === 0) return;

            // Only count active (non-disabled) leaf checkboxes
            let $leafCheckboxes = $parentContainer.find(".select-checkbox:not(:disabled)");
            let total = $leafCheckboxes.length;
            let checked = $leafCheckboxes.filter(":checked").length;

            if (total === 0) {
                // If all options are disabled, just preserve parent unchecked state
                $parentCheckbox.prop("checked", false).prop("indeterminate", false);
            } else if (checked === total) {
                $parentCheckbox.prop("checked", true).prop("indeterminate", false);
            } else if (checked === 0) {
                $parentCheckbox.prop("checked", false).prop("indeterminate", false);
            } else {
                $parentCheckbox.prop("checked", false).prop("indeterminate", true);
            }

            this.syncParents($parentCheckbox);
        }

        syncAllGroups() {
            let $containers = this.$optionsContainer.find(".wi3bit-tree-children");
            $containers.each(function () {
                let depth = $(this).parents(".wi3bit-tree-children").length;
                $(this).data("depth", depth);
            });

            let sortedContainers = $containers.get().sort((a, b) => {
                return $(b).data("depth") - $(a).data("depth");
            });

            $(sortedContainers).each(function () {
                let $parentHeader = $(this).prev(".wi3bit-group-header, .wi3bit-subgroup-header");
                if ($parentHeader.length === 0) return;

                let $parentCheckbox = $parentHeader.find(".group-checkbox");
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

            this.$optionsContainer.children(".wi3bit-group-wrapper").each(function () {
                processSummaryNode($(this));
            });

            this.$optionsContainer.children(".wi3bit-select-option").each(function () {
                let $chk = $(this).find(".select-checkbox");
                if ($chk.prop("checked")) {
                    summaryItems.push($(this).find("label").text().trim());
                }
            });

            function processSummaryNode($wrapper) {
                let $checkbox = $wrapper.children(".wi3bit-group-header, .wi3bit-subgroup-header").find(".group-checkbox");
                if ($checkbox.length && $checkbox.prop("checked") && !$checkbox.prop("indeterminate")) {
                    summaryItems.push($checkbox.siblings("label").text().trim());
                } else {
                    let $childrenContainer = $wrapper.children(".wi3bit-tree-children");
                    $childrenContainer.children(".wi3bit-subgroup-wrapper").each(function () {
                        processSummaryNode($(this));
                    });
                    $childrenContainer.children(".wi3bit-select-option").each(function () {
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
                query = this.$searchContainer.find(".wi3bit-search-input").val().toLowerCase().trim();
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
                    this.$btnAll.addClass("wi3bit-action-disabled");
                    let tooltip = bootstrap.Tooltip.getInstance(this.$btnAll[0]);
                    if (tooltip && typeof tooltip.hide === "function") tooltip.hide();
                } else {
                    this.$btnAll.removeClass("wi3bit-action-disabled");
                }
            }

            if (this.$btnClear) {
                if (visibleTotal === 0 || visibleChecked === 0) {
                    this.$btnClear.addClass("wi3bit-action-disabled");
                    let tooltip = bootstrap.Tooltip.getInstance(this.$btnClear[0]);
                    if (tooltip && typeof tooltip.hide === "function") tooltip.hide();
                } else {
                    this.$btnClear.removeClass("wi3bit-action-disabled");
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
                    this.$btnReset.addClass("wi3bit-action-disabled");
                    let tooltip = bootstrap.Tooltip.getInstance(this.$btnReset[0]);
                    if (tooltip && typeof tooltip.hide === "function") tooltip.hide();
                } else {
                    this.$btnReset.removeClass("wi3bit-action-disabled");
                }
            }

            if (this.$btnOpenAll) {
                let collapsedCount = this.$optionsContainer.find(".wi3bit-tree-children").filter(function() {
                    return this.style.display === "none";
                }).length;
                
                if (!this.settings.grouping.collapsible || collapsedCount === 0) {
                    this.$btnOpenAll.addClass("wi3bit-action-disabled");
                    let tooltip = bootstrap.Tooltip.getInstance(this.$btnOpenAll[0]);
                    if (tooltip && typeof tooltip.hide === "function") tooltip.hide();
                } else {
                    this.$btnOpenAll.removeClass("wi3bit-action-disabled");
                }
            }

            if (this.$btnCloseAll) {
                let expandedCount = this.$optionsContainer.find(".wi3bit-tree-children").filter(function() {
                    return this.style.display !== "none";
                }).length;

                if (!this.settings.grouping.collapsible || expandedCount === 0) {
                    this.$btnCloseAll.addClass("wi3bit-action-disabled");
                    let tooltip = bootstrap.Tooltip.getInstance(this.$btnCloseAll[0]);
                    if (tooltip && typeof tooltip.hide === "function") tooltip.hide();
                } else {
                    this.$btnCloseAll.removeClass("wi3bit-action-disabled");
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

            if ($changedElem && this.settings.grouping.nested) {
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
                this.$originalSelect.trigger("wi3bit:change", [detail]);
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
                this.$optionsContainer.find(".wi3bit-tree-children").show();
                this.$optionsContainer.find(".wi3bit-group-toggle").removeClass("fa-chevron-right").addClass("fa-chevron-down");
                this.updateUI(true);
            }
        }

        collapseAll() {
            if (this.isDisabled) return;
            if (this.settings.grouping.collapsible) {
                this.$optionsContainer.find(".wi3bit-tree-children").hide();
                this.$optionsContainer.find(".wi3bit-group-toggle").removeClass("fa-chevron-down").addClass("fa-chevron-right");
                this.updateUI(true);
            }
        }

        enable() {
            this.isDisabled = false;
            this.$originalSelect.prop("disabled", false);
            this.$wrapper.removeClass("wi3bit-disabled");
            this.$display.removeClass("disabled");
        }

        disable() {
            this.isDisabled = true;
            this.$originalSelect.prop("disabled", true);
            this.closeDropdown();
            this.$wrapper.addClass("wi3bit-disabled");
            this.$display.addClass("disabled");
        }

        refresh() {
            this.destroy();
            this.init();
        }

        destroy() {
            if (this.$wrapper) {
                this.$wrapper.find('[data-bs-toggle="tooltip"]').each(function () {
                    let t = bootstrap.Tooltip.getInstance(this);
                    if (t) t.dispose();
                });
                let $oldDisplay = this.$wrapper.find(".wi3bit-select-display");
                if ($oldDisplay.length) {
                    let t = bootstrap.Tooltip.getInstance($oldDisplay[0]);
                    if (t) t.dispose();
                }
                this.$wrapper.remove();
            }

            if (this.docClickEvent) {
                $(document).off(this.docClickEvent);
            }

            this.$originalSelect.removeData("wi3bit-multi-select");
            this.$originalSelect.show();
            
            this.$originalSelect.trigger("wi3bit:destroy", [this]);
            if (typeof this.settings.callbacks.onDestroy === "function") {
                this.settings.callbacks.onDestroy.call(this.$originalSelect[0], this);
            }
        }
    }

    // jQuery Plugin Definition
    $.fn.wi3bitMultiSelect = function (options, ...args) {
        if (typeof options === "string") {
            let method = options;
            let returns = null;

            this.each(function () {
                let instance = $.data(this, "wi3bit-multi-select");
                if (instance instanceof Wi3bitMultiSelect && typeof instance[method] === "function") {
                    let result = instance[method](...args);
                    if (method === "val" && args.length === 0) {
                        returns = result;
                    }
                }
            });

            return returns !== null ? returns : this;
        }

        return this.each(function () {
            let instance = $.data(this, "wi3bit-multi-select");
            if (instance) {
                instance.destroy();
            }
            $.data(this, "wi3bit-multi-select", new Wi3bitMultiSelect(this, options));
        });
    };

    // Global Defaults (nested structure)
    $.fn.wi3bitMultiSelect.defaults = {
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
})(jQuery);
