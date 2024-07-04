$(document).ready(function() {
    // CONSTANTS AND VARIABLES

    let showDebugInfo = true; // Set this to false to hide the debug info
    
    //DELAY FOR CARDINFO POPUP
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    let primarySortOrder = ['rarity', 'Type/Color', 'alphabetical'];
    let secondarySortCriteria = ['White', 'Blue', 'Black', 'Red', 'Green', 'Multi', 'Colorless', 'Artifact', 'Land', 'Token', 'Emblem'];

    const cardTypes = {
        "Card Types": [
            "White", "Blue", "Black", "Red", "Green", "Multi", "Colorless", "Artifacts", "Conspiracies", "Creatures", "Dungeons", "Emblems", "Enchantments", "Instants", "Lands", "Phenomena", "Planes", "Planeswalkers", "Schemes", "Sorceries", "Tokens", "Tribals", "Vanguards"
        ],
        "Artifact Subtypes": [
            "Clue", "Contraption", "Equipment", "Food", "Fortification", "Gold", "Treasure", "Vehicle"
        ],
        "Creature Subtypes": [
            // ... (keep the existing list of creature subtypes)
        ],
        "Enchantment Subtypes": [
            "Aura", "Background", "Cartouche", "Class", "Curse", "Rune", "Saga", "Shard", "Shrine"
        ],
        "Land Subtypes": [
            "Desert", "Forest", "Gate", "Island", "Lair", "Locus", "Mine", "Mountain", "Plains", "Power-Plant", "Swamp", "Tower", "Urza's"
        ],
        "Planeswalker Subtypes": [
            // ... (keep the existing list of planeswalker subtypes)
        ],
    };

    
    // INITIALISATIONS
    function initializeSortable() {
        $(".sortable-container").sortable({
            items: '> .criteria-item:not(#addTypeColorButton, .toggle-order)',
            axis: 'y',
            containment: 'parent',
            placeholder: 'criteria-item-placeholder',
            forcePlaceholderSize: true,
            update: function(event, ui) {
                updateSecondarySort($(this));
            }
        });

        $(".categories").sortable({
            items: '> .criteria-item',
            axis: 'x',
            tolerance: 'pointer',
            distance: 10,
            cursor: 'move',
            containment: 'parent',
            placeholder: 'main-criteria-placeholder',
            forcePlaceholderSize: true,
            update: function(event, ui) {
                primarySortOrder = $(this).sortable('toArray', { attribute: 'data-criteria' });
                console.log("Updated primary sort order:", primarySortOrder);
            },
            start: function(event, ui) {
                ui.placeholder.height(ui.item.height());
                ui.placeholder.width(ui.item.width());
                $(this).css('min-height', $(this).height());
            },
            stop: function(event, ui) {
                $(this).css('min-height', '');
            }
        });
    }

    function initializeLongPressDelete() {
        const $typeColorContainer = $('.criteria-item[data-criteria="Type/Color"] .sortable-container');
        
        $typeColorContainer.on('pointerdown', function(e) {
            const $criteriaItem = $(e.target).closest('.criteria-item');
            if ($criteriaItem.length && !$criteriaItem.hasClass('toggle-order') && $criteriaItem.attr('id') !== 'addTypeColorButton') {
                new LongPressDelete($criteriaItem[0], deleteSubCriteria);
            }
        });
    }

    function populateDropdown() {
        var $dropdown = $('#newTypeDropdown');
        $dropdown.empty();
        $dropdown.append('<option value="">Select Card Type</option>');
        
        $.each(cardTypes, function(category, subtypes) {
            $dropdown.append($('<option>').val(category).text(category).prop('disabled', true));
            $.each(subtypes, function(i, subtype) {
                $dropdown.append($('<option>').val(subtype).text('    ' + subtype));
            });
            if (subtypes.length === 0) {
                $dropdown.append($('<option>').val(category).text('    ' + category));
            }
        });
    }

    // Initialize
    initializeSortable();
    initializeLongPressDelete();
    populateDropdown();

    // EVENT HANDLERS
    $('#addTypeColorButton').on('click', function() {
        var $button = $(this);
        var $slider = $('#addTypeSlider');
        if ($slider.is(":visible")) {
            closeSlider();
        } else {
            // Position the slider
            var buttonPos = $button.offset();
            $slider.css({
                top: buttonPos.top + $button.outerHeight(),
                left: buttonPos.left
            });

            // Slide open animation
            $slider.show().css({
                width: 0,
                height: 0
            }).animate({
                width: '250px',
                height: '150px'
            }, 300, function() {
                // Ensure the dropdown is visible and reset to default state
                $("#newTypeDropdown").show().val("");
            });
            populateDropdown();
            toggleSortable(false);  // Disable sortable
        }
    });

    $('#addTypeConfirm').on('click', function() {
        var selectedType = $("#newTypeDropdown").val();
        if (selectedType) {
            addNewType(selectedType);
            closeSlider();
            // Reset the dropdown to its default state
            $("#newTypeDropdown").val("");
        }
    });

    $('#addTypeCancel').on('click', closeSlider);

    $('#sortButton').on('click', debounce(function() {
        console.log("Sort button clicked");
        var unsortedList = $('#cardList').val().trim().split('\n').filter(name => name.trim() !== '');
        console.log("Unsorted list:", unsortedList);
        
        if (unsortedList.length === 0) {
            console.log("Empty input, nothing to sort");
            $('#sortedList').empty();
            return;
        }
        
        const showPrices = $('#priceButton').hasClass('highlighted');
    
        // Show loading indicator
        $('#loadingIndicator').show();
        $('#sortedList').empty();
    
        fetchCardDetails(unsortedList).then(function(...cards) {
            console.log("Cards fetched:", cards);
            cards = Array.prototype.slice.call(cards);
            
            console.log("Sorting with criteria:", primarySortOrder, secondarySortCriteria);
            var sortedCards = sortCards(cards, primarySortOrder, secondarySortCriteria);
            console.log("Sorted cards:", sortedCards);
            var groupedCards = groupCards(sortedCards, primarySortOrder);
            console.log("Grouped cards:", groupedCards);
            displaySortedCards(groupedCards, primarySortOrder, showPrices);
        }).catch(function(error) {
            console.error("Error in fetchCardDetails:", error);
        }).always(function() {
            // Hide loading indicator
            $('#loadingIndicator').hide();
        });
    }, 300));

    $('#clearButton').on('click', function() {
        $('#sortedList').empty();
    });

    $('#priceButton').on('click', function() {
        $(this).toggleClass('highlighted');

        if ($(this).hasClass('highlighted')) {
            $('.card .price').show();
        } else {
            $('.card .price').hide();
        }
    });

    $('#printButton').on('click', function() {
        const showPrices = $('#priceButton').hasClass('highlighted');
        var printableContent = generatePrintableContent(showPrices);
        var printWindow = window.open('', '_blank');
        printWindow.document.open();
        printWindow.document.write('<html><head><title>Printable List</title>');
        printWindow.document.write('<style>');
        printWindow.document.write('body { font-family: Arial, sans-serif; }');
        printWindow.document.write('.section-label { font-size: 18px; font-weight: bold; margin-top: 10px; }');
        printWindow.document.write('.price { float: right; color: #888; }');
        if (!showPrices) {
            printWindow.document.write('.price { display: none; }');
        }
        printWindow.document.write('</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<h1>' + $('#listName').val() + '</h1>');
        printWindow.document.write(printableContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
    });
    
    function generatePrintableContent(showPrices) {
        var content = '';
        $('#sortedList').children().each(function() {
            content += $(this).html();
        });
        if (!showPrices) {
            content = content.replace(/<span class="price">.*?<\/span>/g, '');
        }
        return content;
    }

    $(document).on('click', '.toggle-order', function() {
        var $parent = $(this).closest('.subcriteria');
        var $items = $parent.children('.criteria-item:not(.toggle-order)');
        
        if ($items.length >= 2) {
            // Get the items before and after the toggle button
            var $before = $(this).prev('.criteria-item');
            var $after = $(this).next('.criteria-item');

            // Swap their positions
            if ($before.length && $after.length) {
                $before.insertAfter(this);
                $after.insertBefore(this);
            }
        }
    });    

    // UTILITY FUNCTIONS
    function debounce(func, delay) {
        var inDebounce;
        return function() {
            var context = this;
            var args = arguments;
            clearTimeout(inDebounce);
            inDebounce = setTimeout(function() {
                func.apply(context, args);
            }, delay);
        };
    }

    function toggleSortable(enable) {
        $(".sortable-container, .categories").sortable(enable ? "enable" : "disable");
    }

    function closeSlider() {       
        $('#addTypeSlider').animate({
            width: 0,
            height: 0
        }, 300, function() {
            $(this).hide();
            $("#newTypeDropdown").val("");
            toggleSortable(true);  // Re-enable sortable
        });
    }

    function updateSecondarySort($container) {
        secondarySortCriteria = $container.children('.criteria-item').map(function() {
            return $(this).data('criteria');
        }).get();
        console.log("Updated secondary sort criteria:", secondarySortCriteria);
    }

    function addNewType(newType) {
        var $newItem = $('<div class="criteria-item" data-criteria="' + newType + '"><span>' + newType + '</span></div>');
        $('.criteria-item[data-criteria="Type/Color"] .sortable-container').append($newItem);

        // Remove the added type from the dropdown
        $('#newTypeDropdown option[value="' + newType + '"]').remove();

        // Refresh the sortable functionality
        $(".sortable-container").sortable('refresh');

        // Add long-press delete functionality to the new item
        new LongPressDelete($newItem[0], deleteSubCriteria);

        // Update secondarySortCriteria
        secondarySortCriteria.push(newType);
        console.log("Updated secondary sort criteria:", secondarySortCriteria);
    }

    function deleteSubCriteria(element) {
        const criteriaName = $(element).attr('data-criteria');
        $(element).remove();
        
        // Update the secondarySortCriteria array
        const index = secondarySortCriteria.indexOf(criteriaName);
        if (index > -1) {
            secondarySortCriteria.splice(index, 1);
        }
        
        // Add the deleted item back to the dropdown
        const $option = $('<option>', {
            value: criteriaName,
            text: `    ${criteriaName}`
        });
        $('#newTypeDropdown').append($option);
        
        console.log(`Deleted ${criteriaName} from Type/Color criteria`);
        console.log("Updated secondary sort criteria:", secondarySortCriteria);
    }

    // API INTERACTIONS
    function fetchCardDetails(cardNames) {
        if (cardNames.length === 0 || (cardNames.length === 1 && cardNames[0] === '')) {
            return $.Deferred().resolve([]).promise();
        }
        
        var promises = cardNames.map(name => {
            return $.ajax({
                url: `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`,
                method: 'GET',
                dataType: 'json'
            }).then(data => ({
                name: data.name,
                rarity: data.rarity,
                colors: data.colors,
                mana_cost: data.mana_cost,
                price: data.prices.usd || '0.00',
                type_line: data.type_line
            })).catch(error => ({
                name: name,
                rarity: 'unknown',
                colors: null,
                mana_cost: null,
                price: '0.00',
                type_line: 'unknown'
            }));
        });
        return $.when.apply($, promises);
    }

    function determineColor(cardData) {
        if (cardData.colors && cardData.colors.length > 0) {
            return cardData.colors.join(', ');
        } else {
            return 'Colorless';
        }
    }

    // SORTING AND DISPLY FUNCTIONS
    function sortCards(cards, primarySortOrder, secondarySortCriteria) {
        if (!Array.isArray(cards)) {
            console.error("cards is not an array");
            return [];
        }
    
        return cards.sort((a, b) => {
            for (let criterion of primarySortOrder) {
                let compareResult = compareBycriterion(a, b, criterion, secondarySortCriteria);
                if (compareResult !== 0) return compareResult;
            }
            return 0;
        });
    }
    
    function compareBycriterion(a, b, criterion, secondarySortCriteria) {
        switch (criterion) {
            case 'Type/Color':
                let colorA = getTypeColor(a);
                let colorB = getTypeColor(b);
                let indexA = secondarySortCriteria.indexOf(colorA);
                let indexB = secondarySortCriteria.indexOf(colorB);
                
                console.log(`Comparing: ${a.name} (${colorA}, index ${indexA}) vs ${b.name} (${colorB}, index ${indexB})`);
                
                // If both colors are found in the criteria, sort by their index
                if (indexA !== -1 && indexB !== -1) {
                    return indexA - indexB;
                }
                // If one color is not found, prioritize the found color
                else if (indexA !== -1) {
                    return -1;
                }
                else if (indexB !== -1) {
                    return 1;
                }
                // If neither color is found, sort alphabetically
                return colorA.localeCompare(colorB);
            
            case 'rarity':
                let rarityOrderA = getRarityOrder(a.rarity);
                let rarityOrderB = getRarityOrder(b.rarity);
                return rarityOrderA - rarityOrderB;
            
            case 'alphabetical':
                return a.name.localeCompare(b.name);
            
            default:
                return 0;
        }
    }
    
    function getTypeColor(card) {
        console.log("Processing card:", card.name, "Type:", card.type_line, "Mana cost:", card.mana_cost);
    
        // Check if the card data is valid
        if (!card || !card.type_line) {
            console.log("Card data invalid for:", card.name);
            return 'Unknown';
        }
    
        // Handle cards with no mana cost
        if (!card.mana_cost) {
            console.log("Card has no mana cost:", card.name);
            
            // Check for known card types

            // Check for Double Faced Cards
            if (card.name.includes('//')) {
                return 'Multi';
            }
            if (card.type_line.toLowerCase().includes('creature')) {
                return 'Creature';
            }
            if (card.type_line.toLowerCase().includes('land')) {
                return 'Land';
            }
            if (card.type_line.toLowerCase().includes('artifact')) {
                return 'Artifact';
            }
            if (card.type_line.toLowerCase().includes('token')) {
                return 'Token';
            }
            if (card.type_line.toLowerCase().includes('emblem')) {
                return 'Emblem';
            }
            
            // If it's not a known type, mark as Unknown
            console.log("Unknown card type for card with no mana cost:", card.name);
            return 'Unknown';
        }
    
        // Check for Split Cards
        if (card.name.includes('//')) {
            return 'Multi';
        }        
    
        // Check for Hybrid Cards
        if (card.mana_cost.match(/\w\/\w/)) {
            return 'Multi';
        }
    
        // Check if the card has multiple colors
        if (card.colors.length > 1) {
            return 'Multi';
        }
    
        // Check if the card has a single color
        if (card.colors.length === 1) {
            // Return the color name exactly as it appears in secondarySortCriteria
            const colorMap = {
                'W': 'White',
                'U': 'Blue',
                'B': 'Black',
                'R': 'Red',
                'G': 'Green'
            };
            return colorMap[card.colors[0]] || 'Unknown';
        }
    
        // Check for artifacts and lands again as a fallback
        if (card.type_line.toLowerCase().includes('artifact')) {
            return 'Artifact';
        }
        if (card.type_line.toLowerCase().includes('land')) {
            return 'Land';
        }
        if (card.type_line.toLowerCase().includes('token')) {
            return 'Token';
        }
        if (card.type_line.toLowerCase().includes('emblem')) {
            return 'Emblem';
        }
    
        return 'Colorless';
    }
    

    function displaySortedCards(groupedCards, primarySortOrder, showPrices) {
        $('#sortedList').empty();
        
        // Display known cards
        displayGroupLevel(groupedCards.sorted, primarySortOrder, 0, $('#sortedList'), showPrices);
        
        // Display unknown cards at the end if they exist
        if (groupedCards.unknown && groupedCards.unknown.length > 0) {
            let $unknownContainer = $('<div>').addClass('group-level-0');
            $unknownContainer.append('<div class="section-label">Unknown Cards</div>');
            
            groupedCards.unknown.forEach(card => {
                let cardHtml = `<div class="card">${card.name}`;
                if (showPrices) {
                    cardHtml += `<span class="price">$${card.price}</span>`;
                }
                cardHtml += `</div>`;
                $unknownContainer.append(cardHtml);
            });
            
            $('#sortedList').append($unknownContainer);
        }
    }
    
    function displayGroupLevel(group, primarySortOrder, level, $container, showPrices) {
        $.each(group, function(key, value) {
            let $groupContainer = $('<div>').addClass(`group-level-${level}`);
            
            // Always display the header, except for single-letter alphabetical groups
            if (key !== 'Unknown' && (key.length > 1 || !key.match(/^[A-Z]$/))) {
                $groupContainer.append(`<div class="section-label">${key}</div>`);
            }
            
            if (Array.isArray(value)) {
                // This is the deepest level, display cards
                $.each(value, function(i, card) {
                    let cardHtml = `<div class="card">${card.name}`;
                    if (showPrices) {
                        cardHtml += `<span class="price">$${card.price}</span>`;
                    }
                    cardHtml += `</div>`;
                    $groupContainer.append(cardHtml);
                });
            } else {
                // This is not the deepest level, recurse
                displayGroupLevel(value, primarySortOrder, level + 1, $groupContainer, showPrices);
            }
            
            $container.append($groupContainer);
        });
    }

    function groupCards(sortedCards, primarySortOrder) {
        let groupedCards = {};
        let unknownCards = [];
    
        for (let card of sortedCards) {
            let currentLevel = groupedCards;
            let isUnknown = false;
    
            for (let i = 0; i < primarySortOrder.length && !isUnknown; i++) {
                let criterion = primarySortOrder[i];
                let group = getGroupForCriterion(card, criterion);
                
                if (group === 'Unknown') {
                    isUnknown = true;
                    break;
                }
    
                if (!currentLevel[group]) {
                    if (i === primarySortOrder.length - 1) {
                        currentLevel[group] = [];
                    } else {
                        currentLevel[group] = {};
                    }
                }
    
                if (i === primarySortOrder.length - 1) {
                    currentLevel[group].push(card);
                } else {
                    currentLevel = currentLevel[group];
                }
            }
    
            if (isUnknown) {
                unknownCards.push(card);
            }
        }
    
        return { 
            sorted: groupedCards, 
            unknown: unknownCards 
        };
    }
    
    function getGroupForCriterion(card, criterion) {
        switch (criterion) {
            case 'rarity':
                // if (card.type_line && card.type_line.toLowerCase().includes('land')) {
                //     return 'Land';
                // }
                return card.rarity === 'mythic' || card.rarity === 'rare' ? 'Mythic/Rare' : 'Common/Uncommon';
            case 'Type/Color':
                return getTypeColor(card);
            case 'alphabetical':
                return card.name[0].toUpperCase();
            default:
                return 'Unknown';
        }
    }

    function getRarityOrder(rarity) {
        switch (rarity.toLowerCase()) {
            case 'mythic':
                return 0;
            case 'rare':
                return 1;
            case 'uncommon':
                return 2;
            case 'common':
                return 3;
            default:
                return 5;
        }
    }

    // LONGPRESSDELETE CLASS
    class LongPressDelete {
        constructor(element, deleteCallback, duration = 1000) {
            this.element = element;
            this.deleteCallback = deleteCallback;
            this.duration = duration;
            this.timeoutId = null;
            this.isDeleting = false;
        
            this.handlePointerDown = this.handlePointerDown.bind(this);
            this.handlePointerUp = this.handlePointerUp.bind(this);
            this.handlePointerLeave = this.handlePointerLeave.bind(this);
        
            $(this.element).on('pointerdown', this.handlePointerDown);
            $(this.element).on('pointerup', this.handlePointerUp);
            $(this.element).on('pointerleave', this.handlePointerLeave);
        }
        
        handlePointerDown(e) {
            if (e.button !== 0) return; // Only handle left clicks or touches
            this.isDeleting = true;
            $(this.element).addClass('deleting');
            this.timeoutId = setTimeout(() => {
                if (this.isDeleting) {
                    this.deleteCallback(this.element);
                }
            }, this.duration);
        }
        
        handlePointerUp() {
            this.cancelDelete();
        }
        
        handlePointerLeave() {
            this.cancelDelete();
        }
        
        cancelDelete() {
            this.isDeleting = false;
            $(this.element).removeClass('deleting');
            clearTimeout(this.timeoutId);
        }
        
        destroy() {
            $(this.element).off('pointerdown', this.handlePointerDown);
            $(this.element).off('pointerup', this.handlePointerUp);
            $(this.element).off('pointerleave', this.handlePointerLeave);
        }
    }

    // CARD IMAGE POPUP FUNCTIONALITY
    $('#sortedList').on('mouseenter', '.card', debounce(function(e) {
        // Remove any existing popups
        $('.card-popup').remove();

        var cardName = $(this).text().trim().split('$')[0].trim();
        var $popup = $('<div class="card-popup" data-card-name="' + cardName + '"><img src="" alt="Loading..."></div>');
        var $debugInfo = $('<div class="debug-info"></div>');
        $popup.append($debugInfo);
        $('body').append($popup);

        // Position the popup
        $popup.css({
            left: e.pageX + 10,
            top: e.pageY + 10
        });

        // Fetch the card image and data
        $.ajax({
            url: `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`,
            method: 'GET',
            dataType: 'json'
        }).then(function(data) {
            if (data.image_uris && data.image_uris.normal) {
                $popup.find('img').attr('src', data.image_uris.normal);
            } else {
                $popup.find('img').attr('alt', 'Image not available');
            }

            // Add debug info
            if (showDebugInfo) {
                var debugHtml = `
                    <h3>Debug Info</h3>
                    <p><strong>Name:</strong> ${data.name}</p>
                    <p><strong>Mana Cost:</strong> ${data.mana_cost || 'N/A'}</p>
                    <p><strong>Type:</strong> ${data.type_line}</p>
                    <p><strong>Rarity:</strong> ${data.rarity}</p>
                    <p><strong>Set:</strong> ${data.set_name} (${data.set})</p>
                    <p><strong>Colors:</strong> ${data.colors ? data.colors.join(', ') : 'Colorless'}</p>
                    <p><strong>CMC:</strong> ${data.cmc}</p>
                    <p><strong>Oracle Text:</strong> ${data.oracle_text ? data.oracle_text.replace(/\n/g, '<br>') : 'N/A'}</p>
                    <p><strong>Power/Toughness:</strong> ${data.power ? data.power + '/' + data.toughness : 'N/A'}</p>
                    <p><strong>Loyalty:</strong> ${data.loyalty || 'N/A'}</p>
                    <p><strong>Legalities:</strong></p>
                    <ul>
                        ${Object.entries(data.legalities).map(([format, legality]) => 
                            `<li>${format}: ${legality}</li>`
                        ).join('')}
                    </ul>
                    <p><strong>Price (USD):</strong> $${data.prices.usd || 'N/A'}</p>
                `;
                $debugInfo.html(debugHtml);
            } else {
                $debugInfo.hide();
            }
        }).fail(function() {
            $popup.find('img').attr('alt', 'Failed to load image');
        });
    }, 100)); // 100ms delay

    // Handle popup visibility and positioning
    $(document).on('mousemove', function(e) {
        var $popup = $('.card-popup');
        if ($popup.length) {
            var $hoveredCard = $(e.target).closest('.card');
            if ($hoveredCard.length) {
                var cardName = $hoveredCard.text().trim().split('$')[0].trim();
                if (cardName === $popup.data('card-name')) {
                    $popup.css({
                        left: e.pageX + 10,
                        top: e.pageY + 10
                    });
                } else {
                    $popup.remove();
                }
            } else if (!$(e.target).closest('.card-popup').length) {
                $popup.remove();
            }
        }
    });

    // End of document.ready function
});
