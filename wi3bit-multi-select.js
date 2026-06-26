/**
 * WI3BIT Custom Multi-Select Dropdown Plugin
 * Version: 1.0.0
 * Description: A dynamic, searchable, grouped, tree-nesting multi-select plugin.
 */
(function ($) {
    $.fn.wi3bitMultiSelect = function (options) {
        let settings = $.extend(
            {
                nestedGroups: false,
                showSelectAll: true,
                showClearAll: true,
                showReset: false,
                showSearch: false,
                showTotalCount: false,
                width: "100%",
                height: "36px",
                dropdownHeight: "400px",
                collapsibleGroups: false,
                groupsCollapsedByDefault: false,
                showExpandAll: false,
                showCollapseAll: false,
            },
            options,
        );

        return this.each(function () {
            let $originalSelect = $(this);
            let $btnAll = null;
            let $btnClear = null;
            let $btnReset = null;
            let $btnOpenAll = null;
            let $btnCloseAll = null;

            let existingWrapper = $originalSelect.data(
                "wi3bit-multi-select-wrapper",
            );
            let existingEvent = $originalSelect.data(
                "wi3bit-multi-select-event",
            );
            if (existingWrapper) {
                existingWrapper
                    .find('[data-bs-toggle="tooltip"]')
                    .each(function () {
                        let t = bootstrap.Tooltip.getInstance(this);
                        if (t) t.dispose();
                    });
                let $oldDisplay = existingWrapper.find(
                    ".wi3bit-select-display",
                );
                if ($oldDisplay.length) {
                    let t = bootstrap.Tooltip.getInstance($oldDisplay[0]);
                    if (t) t.dispose();
                }
                existingWrapper.remove();
                if (existingEvent) {
                    $(document).off(existingEvent);
                }
                $originalSelect.show();
            }

            if (!$originalSelect.prop("multiple")) {
                return;
            }

            let defaultSelectedValues = $originalSelect
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

            let totalOptions = $originalSelect
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

            let $wrapper = $(
                '<div class="wi3bit-multi-select position-relative"></div>',
            );
            if (settings.width) {
                $wrapper.css("width", settings.width);
            }

            let requiredClasses = ["form-select", "wi3bit-select-display"];
            let uniqueClasses = [
                ...new Set([...requiredClasses, ...originalClasses]),
            ].join(" ");

            let $display = $(
                `<div class="${uniqueClasses}" style="${originalStyles}"></div>`,
            );
            if (settings.height) {
                $display.css({
                    height: settings.height,
                    "min-height": settings.height,
                });
            }

            let pText = $originalSelect.data("placeholder") || "Select...";
            let $placeholder = $(
                `<span class="text-muted placeholder-text"><i class="fa-solid fa-list-check me-2"></i>${pText}</span>`,
            );
            let $selectedText = $(
                '<span class="wi3bit-selected-text" style="display:none;"></span>',
            );
            let $countBadge = $(
                '<span class="badge bg-primary rounded-pill wi3bit-select-badge text-white" style="display:none;"></span>',
            );
            let $chevron = $(
                '<i class="fa-solid fa-chevron-down position-absolute wi3bit-select-chevron"></i>',
            );

            let $dropdown = $(
                '<div class="dropdown-menu shadow p-2 mt-1 w-100"></div>',
            );
            if (settings.dropdownHeight) {
                $dropdown.css("max-height", settings.dropdownHeight);
            }

            let $optionsContainer = $("<div></div>");
            let $notFound = $(
                '<div class="wi3bit-not-found text-muted text-center" style="display:none;"><i class="fa-solid fa-triangle-exclamation me-2"></i>No matches found</div>',
            );

            let showHeader =
                settings.showSelectAll ||
                settings.showClearAll ||
                settings.showReset ||
                settings.showSearch ||
                settings.showTotalCount;
            let $searchContainer;

            if (showHeader) {
                let $btnGroup = $(
                    '<div class="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom wi3bit-action-header"></div>',
                );

                if (settings.showSearch) {
                    $searchContainer = $(`
                        <div class="wi3bit-search-container flex-grow-1">
                            <div class="input-group input-group-sm">
                                <span class="input-group-text bg-transparent border-end-0 text-muted" style="border-color: var(--bs-gray-200); padding: 0.25rem 0.5rem;"><i class="fa-solid fa-magnifying-glass"></i></span>
                                <input type="text" class="form-control border-start-0 wi3bit-search-input ps-0" placeholder="Search..." style="border-color: var(--bs-gray-200); font-size: 0.82rem; height: 30px;">
                            </div>
                        </div>
                    `);
                    $btnGroup.append($searchContainer);

                    let $searchInput = $searchContainer.find(
                        ".wi3bit-search-input",
                    );
                    $searchInput.on("input", function () {
                        let query = $(this).val().toLowerCase().trim();
                        if (query === "") {
                            $optionsContainer
                                .find(
                                    ".wi3bit-group-wrapper, .wi3bit-group-header, .wi3bit-subgroup-wrapper, .wi3bit-subgroup-header, .wi3bit-select-option",
                                )
                                .show();
                            if (settings.collapsibleGroups) {
                                $optionsContainer.find(".wi3bit-tree-children").each(function () {
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
                            $notFound.hide();
                        } else {
                            $optionsContainer
                                .find(
                                    ".wi3bit-group-wrapper, .wi3bit-group-header, .wi3bit-subgroup-wrapper, .wi3bit-subgroup-header, .wi3bit-select-option",
                                )
                                .hide();
                            $optionsContainer
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
                                        if (settings.collapsibleGroups) {
                                            let $childrenContainers = $ancestors.children(".wi3bit-tree-children");
                                            $childrenContainers.show();
                                            $ancestors.children(".wi3bit-group-header, .wi3bit-subgroup-header")
                                                .find(".wi3bit-group-toggle")
                                                .removeClass("fa-chevron-right")
                                                .addClass("fa-chevron-down");
                                        }
                                    }
                                });

                            let visibleOptions = $optionsContainer.find(
                                ".wi3bit-select-option:visible",
                            ).length;
                            if (visibleOptions === 0) {
                                $notFound.text("No matches found").show();
                            } else {
                                $notFound.hide();
                            }
                        }
                        updateHeaderButtons();
                    });
                }

                let hasButtons =
                    settings.showSelectAll ||
                    settings.showClearAll ||
                    settings.showReset ||
                    settings.showTotalCount ||
                    (settings.collapsibleGroups && (settings.showExpandAll || settings.showCollapseAll));
                if (hasButtons) {
                    let $actionsWrapper = $(
                        '<div class="d-flex gap-1 align-items-center"></div>',
                    );
                    if (settings.showSearch) {
                        $actionsWrapper.addClass("ms-auto");
                    } else {
                        $actionsWrapper.addClass(
                            "w-100 justify-content-between",
                        );
                    }

                    if (settings.showTotalCount) {
                        let $totalBadge = $(
                            `<span class="badge bg-light text-dark border me-1 small wi3bit-total-options-badge" data-bs-toggle="tooltip" title="Total Options">${totalOptions}</span>`,
                        );
                        $actionsWrapper.append($totalBadge);
                        new bootstrap.Tooltip($totalBadge[0]);
                    }

                    let buttons = [];

                    if (settings.showSelectAll) {
                        buttons.push({
                            id: "selectAll",
                            title: "Select All",
                            icon: "fa-check-double",
                            hoverClass: "wi3bit-text-hover-primary",
                            action: function ($btn) {
                                $optionsContainer
                                    .find('input[type="checkbox"]:visible')
                                    .prop("checked", true);
                                updateUI();
                            }
                        });
                    }
                    if (settings.showClearAll) {
                        buttons.push({
                            id: "clearAll",
                            title: "Clear All",
                            icon: "fa-xmark",
                            hoverClass: "wi3bit-text-hover-danger",
                            action: function ($btn) {
                                $optionsContainer
                                    .find('input[type="checkbox"]:visible')
                                    .prop("checked", false);
                                updateUI();
                            }
                        });
                    }
                    if (settings.showReset) {
                        buttons.push({
                            id: "reset",
                            title: "Reset to Default",
                            icon: "fa-arrow-rotate-left",
                            hoverClass: "wi3bit-text-hover-primary",
                            action: function ($btn) {
                                $optionsContainer
                                    .find(".select-checkbox:visible")
                                    .each(function () {
                                        let isDefault =
                                            defaultSelectedValues.includes(
                                                $(this).val(),
                                            );
                                        $(this).prop("checked", isDefault);
                                    });
                                updateUI();
                            }
                        });
                    }
                    if (settings.collapsibleGroups && settings.showExpandAll) {
                        buttons.push({
                            id: "openAll",
                            title: "Expand All",
                            icon: "fa-angles-down",
                            hoverClass: "wi3bit-text-hover-primary",
                            action: function ($btn) {
                                $optionsContainer.find(".wi3bit-tree-children").show();
                                $optionsContainer.find(".wi3bit-group-toggle").removeClass("fa-chevron-right").addClass("fa-chevron-down");
                                updateUI();
                            }
                        });
                    }
                    if (settings.collapsibleGroups && settings.showCollapseAll) {
                        buttons.push({
                            id: "closeAll",
                            title: "Collapse All",
                            icon: "fa-angles-up",
                            hoverClass: "wi3bit-text-hover-danger",
                            action: function ($btn) {
                                $optionsContainer.find(".wi3bit-tree-children").hide();
                                $optionsContainer.find(".wi3bit-group-toggle").removeClass("fa-chevron-down").addClass("fa-chevron-right");
                                updateUI();
                            }
                        });
                    }

                    function saveBtnReference(id, $elem) {
                        if (id === "selectAll") $btnAll = $elem;
                        else if (id === "clearAll") $btnClear = $elem;
                        else if (id === "reset") $btnReset = $elem;
                        else if (id === "openAll") $btnOpenAll = $elem;
                        else if (id === "closeAll") $btnCloseAll = $elem;
                    }

                    let maxVisible = settings.showSearch ? 3 : 5;
                    let showOverflow = buttons.length > maxVisible;
                    let visibleCount = showOverflow ? maxVisible - 1 : buttons.length;

                    // Render visible buttons directly
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

                    // Render overflow three-dots menu if needed
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

                $dropdown.append($btnGroup);
            }

            // Initialize tooltip for truncated select options display
            let displayTooltip = new bootstrap.Tooltip($display[0], {
                title: function () {
                    return $selectedText.text();
                },
                trigger: "hover",
                placement: "top",
            });

            $display.on("show.bs.tooltip", function (e) {
                let el = $selectedText[0];
                let isDropdownOpen = $dropdown.hasClass("show");
                if (
                    isDropdownOpen ||
                    $selectedText.is(":hidden") ||
                    el.scrollWidth <= el.clientWidth
                ) {
                    e.preventDefault();
                }
            });

            if (totalOptions === 0) {
                $notFound.text("No options available").show();
            }

            if (settings.nestedGroups) {
                let tree = {
                    children: {},
                    options: []
                };

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
                                collapsed: settings.groupsCollapsedByDefault
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
                    let uid = "opt_" + Math.random().toString(36).substr(2, 9);

                    return $(`
                        <div class="wi3bit-select-option py-2 px-2 m-0 wi3bit-tree-node">
                            <div class="form-check m-0">
                                <input class="form-check-input select-checkbox" type="checkbox" value="${val}" id="${uid}" data-parent-path="${parentIdPath}" ${isChecked}>
                                <label class="form-check-label w-100" for="${uid}" style="cursor:pointer;">${text}</label>
                            </div>
                        </div>
                    `);
                }

                function renderNode(node, depth) {
                    let isCollapsed = settings.collapsibleGroups && node.collapsed;
                    let toggleIconClass = isCollapsed ? "fa-chevron-right" : "fa-chevron-down";
                    let childrenStyle = isCollapsed ? 'style="display: none;"' : "";
                    
                    let toggleIconHtml = settings.collapsibleGroups 
                        ? `<i class="fa-solid ${toggleIconClass} me-2 wi3bit-group-toggle wi3bit-cursor-pointer"></i>` 
                        : "";

                    if (depth === 1) {
                        let $groupWrapper = $('<div class="wi3bit-group-wrapper mb-2"></div>');
                        let $groupHeader = $(`
                            <div class="dropdown-header wi3bit-group-header px-2 py-2 d-flex align-items-center">
                                ${toggleIconHtml}
                                <div class="form-check m-0 flex-grow-1">
                                    <input class="form-check-input group-checkbox" type="checkbox" id="${node.checkboxId}" data-full-path="${node.fullIdPath}">
                                    <label class="form-check-label w-100 fw-bold" for="${node.checkboxId}" style="cursor:pointer;">${node.name}</label>
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
                            <div class="dropdown-header wi3bit-subgroup-header px-2 py-2 d-flex align-items-center">
                                ${toggleIconHtml}
                                <div class="form-check m-0 flex-grow-1">
                                    <input class="form-check-input group-checkbox" type="checkbox" id="${node.checkboxId}" data-full-path="${node.fullIdPath}">
                                    <label class="form-check-label w-100 fw-bold" for="${node.checkboxId}" style="cursor:pointer;">
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

                // Render all top-level groups
                for (let gId in tree.children) {
                    $optionsContainer.append(renderNode(tree.children[gId], 1));
                }
                
                // Render any top-level options that don't belong to any group
                tree.options.forEach(function ($optTag) {
                    $optionsContainer.append(renderOption($optTag, ""));
                });
            } else {
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
                    let uid = "opt_" + Math.random().toString(36).substr(2, 9);

                    let $opt = $(`
                        <div class="wi3bit-select-option mb-1 py-2 px-2 m-0">
                            <div class="form-check m-0 ms-1">
                                <input class="form-check-input select-checkbox" type="checkbox" value="${val}" id="${uid}" ${isChecked}>
                                <label class="form-check-label w-100" for="${uid}" style="cursor:pointer;">${text}</label>
                            </div>
                        </div>
                    `);
                    $optionsContainer.append($opt);
                });
            }

            $dropdown.append($optionsContainer);
            $dropdown.append($notFound);

            $display.append($placeholder, $selectedText, $countBadge, $chevron);
            $wrapper.append($display, $dropdown);
            $originalSelect.after($wrapper);

            $originalSelect.data("wi3bit-multi-select-wrapper", $wrapper);

            function syncParents($elem) {
                let $parentContainer = $elem.closest(".wi3bit-tree-children");
                if ($parentContainer.length === 0) return;

                let $parentHeader = $parentContainer.prev(".wi3bit-group-header, .wi3bit-subgroup-header");
                if ($parentHeader.length === 0) return;

                let $parentCheckbox = $parentHeader.find(".group-checkbox");
                if ($parentCheckbox.length === 0) return;

                let $leafCheckboxes = $parentContainer.find(".select-checkbox");
                let total = $leafCheckboxes.length;
                let checked = $leafCheckboxes.filter(":checked").length;

                if (checked === total) {
                    $parentCheckbox.prop("checked", true).prop("indeterminate", false);
                } else if (checked === 0) {
                    $parentCheckbox.prop("checked", false).prop("indeterminate", false);
                } else {
                    $parentCheckbox.prop("checked", false).prop("indeterminate", true);
                }

                syncParents($parentCheckbox);
            }

            function syncAllGroups() {
                let $containers = $optionsContainer.find(".wi3bit-tree-children");
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

                    let $leafCheckboxes = $(this).find(".select-checkbox");
                    let total = $leafCheckboxes.length;
                    let checked = $leafCheckboxes.filter(":checked").length;

                    if (checked === total && total > 0) {
                        $parentCheckbox.prop("checked", true).prop("indeterminate", false);
                    } else if (checked === 0) {
                        $parentCheckbox.prop("checked", false).prop("indeterminate", false);
                    } else {
                        $parentCheckbox.prop("checked", false).prop("indeterminate", true);
                    }
                });
            }

            function getSmartSelectedText() {
                if (!settings.nestedGroups) {
                    let selectedTexts = [];
                    $optionsContainer
                        .find(".select-checkbox:checked")
                        .each(function () {
                            selectedTexts.push(
                                $(this).siblings("label").text().trim(),
                            );
                        });
                    return selectedTexts.join(", ");
                }

                let summaryItems = [];

                $optionsContainer.children(".wi3bit-group-wrapper").each(function () {
                    processSummaryNode($(this));
                });

                $optionsContainer.children(".wi3bit-select-option").each(function () {
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

            function updateHeaderButtons() {
                let query = "";
                if (settings.showSearch && $searchContainer) {
                    query = $searchContainer.find(".wi3bit-search-input").val().toLowerCase().trim();
                }

                let $visibleCheckboxes;
                if (query === "") {
                    $visibleCheckboxes = $optionsContainer.find(".select-checkbox");
                } else {
                    $visibleCheckboxes = $optionsContainer.find(".select-checkbox:visible");
                }

                let visibleTotal = $visibleCheckboxes.length;
                let visibleChecked = $visibleCheckboxes.filter(":checked").length;

                if ($btnAll) {
                    if (visibleTotal === 0 || visibleChecked === visibleTotal) {
                        $btnAll.addClass("wi3bit-action-disabled");
                        let tooltip = bootstrap.Tooltip.getInstance($btnAll[0]);
                        if (tooltip) {
                            if (typeof tooltip.hide === "function") tooltip.hide();
                        }
                    } else {
                        $btnAll.removeClass("wi3bit-action-disabled");
                    }
                }

                if ($btnClear) {
                    if (visibleTotal === 0 || visibleChecked === 0) {
                        $btnClear.addClass("wi3bit-action-disabled");
                        let tooltip = bootstrap.Tooltip.getInstance($btnClear[0]);
                        if (tooltip) {
                            if (typeof tooltip.hide === "function") tooltip.hide();
                        }
                    } else {
                        $btnClear.removeClass("wi3bit-action-disabled");
                    }
                }

                if ($btnReset) {
                    let isResetDisabled = true;
                    $visibleCheckboxes.each(function () {
                        let isChecked = $(this).prop("checked");
                        let isDefault = defaultSelectedValues.includes($(this).val());
                        if (isChecked !== isDefault) {
                            isResetDisabled = false;
                            return false;
                        }
                    });
                    if (isResetDisabled) {
                        $btnReset.addClass("wi3bit-action-disabled");
                        let tooltip = bootstrap.Tooltip.getInstance($btnReset[0]);
                        if (tooltip) {
                            if (typeof tooltip.hide === "function") tooltip.hide();
                        }
                    } else {
                        $btnReset.removeClass("wi3bit-action-disabled");
                    }
                }

                // Expand All (Open All)
                if ($btnOpenAll) {
                    let collapsedCount = $optionsContainer.find(".wi3bit-tree-children").filter(function() {
                        return this.style.display === "none";
                    }).length;
                    
                    if (!settings.collapsibleGroups || collapsedCount === 0) {
                        $btnOpenAll.addClass("wi3bit-action-disabled");
                        let tooltip = bootstrap.Tooltip.getInstance($btnOpenAll[0]);
                        if (tooltip) {
                            if (typeof tooltip.hide === "function") tooltip.hide();
                        }
                    } else {
                        $btnOpenAll.removeClass("wi3bit-action-disabled");
                    }
                }

                // Collapse All (Close All)
                if ($btnCloseAll) {
                    let expandedCount = $optionsContainer.find(".wi3bit-tree-children").filter(function() {
                        return this.style.display !== "none";
                    }).length;

                    if (!settings.collapsibleGroups || expandedCount === 0) {
                        $btnCloseAll.addClass("wi3bit-action-disabled");
                        let tooltip = bootstrap.Tooltip.getInstance($btnCloseAll[0]);
                        if (tooltip) {
                            if (typeof tooltip.hide === "function") tooltip.hide();
                        }
                    } else {
                        $btnCloseAll.removeClass("wi3bit-action-disabled");
                    }
                }
            }

            function updateUI($changedElem) {
                let checkedCount = 0;
                let selectedValues = [];
                $optionsContainer
                    .find(".select-checkbox:checked")
                    .each(function () {
                        checkedCount++;
                        selectedValues.push($(this).val());
                    });
                $originalSelect.val(selectedValues).trigger("change");

                if ($changedElem && settings.nestedGroups) {
                    syncParents($changedElem);
                } else if (settings.nestedGroups) {
                    syncAllGroups();
                }

                let $btnAllIcon = $wrapper.find(".fa-check-double");
                if ($btnAllIcon.length) {
                    if (checkedCount === totalOptions && totalOptions > 0) {
                        $btnAllIcon.addClass("text-primary");
                    } else {
                        $btnAllIcon.removeClass("text-primary");
                    }
                }

                if (checkedCount > 0) {
                    $placeholder.hide();
                    let smartText = getSmartSelectedText();
                    $selectedText.text(smartText).show();
                    $countBadge.text(checkedCount).show();
                } else {
                    $placeholder.show();
                    $selectedText.hide();
                    $countBadge.hide();
                }

                updateHeaderButtons();
            }

            updateUI();

            $display.on("click", function () {
                $dropdown.toggleClass("show");
                displayTooltip.hide();
                if (
                    $dropdown.hasClass("show") &&
                    settings.showSearch &&
                    $searchContainer
                ) {
                    setTimeout(function () {
                        $searchContainer.find(".wi3bit-search-input").focus();
                    }, 50);
                }
            });

            let docClickEvent =
                "click.wi3bit-" + Math.random().toString(36).substr(2, 9);
            $(document).on(docClickEvent, function (e) {
                if (
                    !$wrapper.is(e.target) &&
                    $wrapper.has(e.target).length === 0
                )
                    $dropdown.removeClass("show");
            });
            $originalSelect.data("wi3bit-multi-select-event", docClickEvent);

            $optionsContainer.on("click", ".wi3bit-group-toggle", function (e) {
                e.stopPropagation();
                let $header = $(this).closest(".wi3bit-group-header, .wi3bit-subgroup-header");
                let $children = $header.next(".wi3bit-tree-children");

                let isCollapsed = $children.is(":hidden");
                if (isCollapsed) {
                    $children.show();
                    $(this).removeClass("fa-chevron-right").addClass("fa-chevron-down");
                } else {
                    $children.hide();
                    $(this).removeClass("fa-chevron-down").addClass("fa-chevron-right");
                }
            });

            $optionsContainer.on(
                "click",
                ".wi3bit-group-header, .wi3bit-subgroup-header, .wi3bit-select-option",
                function (e) {
                    if (
                        $(e.target).is('input[type="checkbox"]') ||
                        $(e.target).is("label") ||
                        $(e.target).hasClass("wi3bit-group-toggle")
                    ) {
                        return;
                    }

                    if ($(this).hasClass("wi3bit-group-header") || $(this).hasClass("wi3bit-subgroup-header")) {
                        if (settings.collapsibleGroups) {
                            $(this).find(".wi3bit-group-toggle").trigger("click");
                            return;
                        }
                    }

                    let $checkbox = $(this)
                        .find('input[type="checkbox"]')
                        .first();
                    if ($checkbox.length) {
                        $checkbox
                            .prop("checked", !$checkbox.prop("checked"))
                            .trigger("change");
                    }
                },
            );

            $optionsContainer.on("change", ".select-checkbox", function () {
                updateUI($(this));
            });

            $optionsContainer.on("change", ".group-checkbox", function () {
                let isChecked = $(this).prop("checked");
                let $childrenContainer = $(this).closest(".wi3bit-group-header, .wi3bit-subgroup-header").next(".wi3bit-tree-children");
                $childrenContainer.find('input[type="checkbox"]').prop("checked", isChecked).prop("indeterminate", false);
                updateUI($(this));
            });
        });
    };
})(jQuery);
