
<style>
    option {
      background-color: white;
      color: #343f56;
      border-radius: 10px;
      margin: 5px;
      padding-top: 5px;
      padding-bottom: 5px;
    }
    option:hover {
      background-color: #b3cbff;
      padding-left: 10px;
    }
    option:checked {
      color: #343f56;
      background: blue linear-gradient(0deg, #abf5ff 0%, #afd9fa 100%);
      padding-left: 10px;
    }
    select[multiple]:focus option:checked {
      background: blue linear-gradient(0deg, #abf5ff 0%, #afd9fa 100%);
      color: #343f56;
      padding-left: 10px;
    }
  </style>
  
  <script>

    // using this to store all user Activity IDs
    // this way I can easily restore all of them if the user decides
    // to restore soft deleted Activities
    let userActivityIDs = [];

    // used to sort the dropdowns and put the main user first
    let targetValue = "";

    // using this to store Team Member details for Activity Assignments
    let teamMemberDetails = {};

    let currentEditingOwnershipIDs = [];

    // address autocomplete stuff
    let autocomplete;
    window.initAutocomplete = function () {
      const addressInput = document.getElementById("address-input");
      autocomplete = new google.maps.places.Autocomplete(addressInput, {
        types: ["address"],
        fields: ["formatted_address"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const selectedAddress = place.formatted_address || "";
      });
    };

    function createOwnershipInputs(start, amountOfOwners, elementID) {
      const editAddedOwnersContainer = document.getElementById(elementID);
      for (i=start; i < amountOfOwners; i++) {
        const editIndividualOwnershipDiv = document.createElement("div");
        editIndividualOwnershipDiv.classList.add("individual-ownership-div");
        const editTeamMemberOwnershipSelect = document.createElement("select");
        editTeamMemberOwnershipSelect.classList.add("team-member-dropdown");
        editTeamMemberOwnershipSelect.classList.add("w-select");
        editTeamMemberOwnershipSelect.id = `edit-team-member-dropdown-${i+1}`;
        const options = [];
        const values = [];
        for (let key in teamMemberDetails) {
          const teamMemberName = teamMemberDetails[key].name;
          const teamMemberId = key;
          options.push(teamMemberName);
          values.push(teamMemberId);
        }
        options.forEach((text, index) => {
          const option = document.createElement("option");
          option.value = values[index];
          option.textContent = text;
          editTeamMemberOwnershipSelect.appendChild(option);
        });
        const optionToMove = Array.from(editTeamMemberOwnershipSelect.options).find(
          opt => opt.value == targetValue
        );
        if (optionToMove) {
          editTeamMemberOwnershipSelect.removeChild(optionToMove);
          editTeamMemberOwnershipSelect.insertBefore(optionToMove, editTeamMemberOwnershipSelect.firstChild);
          editTeamMemberOwnershipSelect.value = targetValue;
        }
        const editTeamMemberPercentageInput = document.createElement("input");
        editTeamMemberPercentageInput.classList.add("form-input-field");
        editTeamMemberPercentageInput.classList.add("w-input");
        editTeamMemberPercentageInput.id = `edit-ownership-percentage-${i+1}`;
        editTeamMemberPercentageInput.type = "text";
        editTeamMemberPercentageInput.placeholder = "Percentage...";
        editIndividualOwnershipDiv.appendChild(editTeamMemberOwnershipSelect);
        editIndividualOwnershipDiv.appendChild(editTeamMemberPercentageInput);
        editAddedOwnersContainer.appendChild(editIndividualOwnershipDiv);
        editAddedOwnersContainer.style.display = "flex";
      }
    }

    
    document.addEventListener("DOMContentLoaded", function () {

      const activitiesLoadingDiv = document.querySelector('#activities-loading-div');
      const noActivitiesDiv = document.querySelector('#no-activities-div');
      const groupAllRentalsForm = document.querySelector('#wf-form-group-all-rentals');
      const customToggle = document.querySelector('#custom-toggle');
      const lockedString = document.querySelector('#locked-string');
      const groupingStatusString = document.querySelector('#grouping-status-string');
      const tradeOrBusinessOptionsDiv = document.querySelector('#trade-or-business-options-div');
      const tradeOrBusinessRadioNo = document.querySelector('#trade-or-business-radio-no');
      const tradeOrBusinessRadioYes = document.querySelector('#trade-or-business-radio-yes');
      const tradeOrBusinessValues = document.getElementById("trade-or-business-values");
      const restoreDeletedActivitiesDiv = document.getElementById("restore-deleted-activities-div");
      const amountOfOwnersDropdown = document.getElementById("amount-of-owners");
      const taxIdInputField = document.getElementById("EIN");
      const taxIdFeedbackLabel = document.getElementById("tax-id-feedback-label");

      noActivitiesDiv.style.display = "none";
      activitiesLoadingDiv.style.display = "flex";
      lockedString.style.display = "none";
      groupingStatusString.textContent = "Status: Not Grouped";
      tradeOrBusinessOptionsDiv.style.display = "none";
      restoreDeletedActivitiesDiv.style.display = "none";
      taxIdFeedbackLabel.style.display = "none";  

      // check that the tax id is the proper format: EIN or SSN
      function isValidTaxID(input) {
        const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;
        const einPattern = /^\d{2}-\d{7}$/;
        return ssnPattern.test(input) || einPattern.test(input);
      }

      taxIdInputField.addEventListener("input", function () {

        const value = taxIdInputField.value.trim();

        console.log("in the blur function");
    
        if (!value) {
          console.log("leaving the blur function");
          feedback.textContent = "";
          return;
        }
  
        if (isValidTaxID(value)) {
          taxIdFeedbackLabel.textContent = "✅ Valid Tax ID";
          taxIdFeedbackLabel.style.color = "#26ac0b";
          taxIdFeedbackLabel.style.display = "block";
        } else {
          taxIdFeedbackLabel.textContent = "❌ Invalid Tax ID format";
          taxIdFeedbackLabel.style.color = "#c71a1a";
          taxIdFeedbackLabel.style.display = "block";
        }
      });
  
      // modify the new Activity form based on radio button selection
      const radioButtonRental = document.getElementById("rental-radio");
      const radioButtonTradeBusiness = document.getElementById("trade-business-radio");
  
      // select default radio button
      if (radioButtonRental) {
        radioButtonRental.checked = true;
      }
  
      // function to change form details based on the radio buttons
      function toggleFormSettings() {
  
        const addressInputField = document.getElementById("address-input");
  
        if (radioButtonRental.checked) {
  
          // change name label
          const newActivityNameLabel = document.getElementById("new-activity-name-label");
          newActivityNameLabel.innerText = "Rental Description *";
  
          // change address label
          const newActivityAddressLabel = document.getElementById("new-activity-address-label");
          newActivityAddressLabel.innerText = "Rental Address *";
          addressInputField.required = true;
  
        } else {
  
          // change name label
          const newActivityNameLabel = document.getElementById("new-activity-name-label");
          newActivityNameLabel.innerText = "Business Name *";
  
          // change address label
          const newActivityAddressLabel = document.getElementById("new-activity-address-label");
          newActivityAddressLabel.innerText = "Business Address";
          addressInputField.required = false;
        }
      }
  
      radioButtonRental.addEventListener("change", toggleFormSettings);
      radioButtonTradeBusiness.addEventListener("change", toggleFormSettings);
  
      // if trade or business, show 11 options div
      tradeOrBusinessRadioYes.addEventListener("change", function () {
          if (this.checked) {
              tradeOrBusinessOptionsDiv.style.display = "block";
  
              var tradeOrBusinessSelected = tradeOrBusinessValues.value !== "";
              if (!tradeOrBusinessSelected) {

                  // make sure at minimum first option is selected
                  if (tradeOrBusinessValues) {
                    tradeOrBusinessValues.selectedIndex = 0;
                  }
              }
          }
      });
  
      // if no trade or business, hide 11 options div
      tradeOrBusinessRadioNo.addEventListener("change", function () {
          if (this.checked) {
              tradeOrBusinessOptionsDiv.style.display = "none";
          }
      });
  
      // trade or business radio button default
      var tradeOrBusinessRadioButton = document.getElementById("trade-or-business-radio-no");
        if (tradeOrBusinessRadioButton) {
          tradeOrBusinessRadioButton.checked = true;
      }
  
      // hidden Activity form stuff + ownership percentage stuff
      const newActivityForm = document.querySelector('#wf-form-new-activity-form');
      const hiddenTypeField = document.querySelector('#form-type');
      const ownershipArrayTextfield = document.getElementById("ownership-array-textfield");
  
      newActivityForm.addEventListener('submit', function (event) {
        hiddenTypeField.value = `new-activity-form`;
      });

      // fake submit button for the Activity form
      // using this to create a check
      // when the user 'submits' the form it triggers our check
      // if it passes the check it triggers the actually form submission
      const amountOfOwnersTextfield = document.getElementById("amount-of-owners");
      const activityFormFakeSubmitButton = document.getElementById("activity-form-fake-submit-button");
      const activityFormSubmitButton = document.getElementById("activity-form-submit-button");
  
      activityFormFakeSubmitButton.addEventListener('click', function (event) {
  
        // store the data and pass to the form submission
        const ownershipData = [];
  
        // check ownership percentages - need to add up to 100 exactly
        const amountOfOwners = parseInt(amountOfOwnersTextfield.value);
        let totalPercentage = 0.0;
  
        // add the initial percentage
        const initialOwnershipPercentage = parseFloat(document.getElementById("ownership-percentage").value) || 0;
        totalPercentage += initialOwnershipPercentage;
  
        const teamMemberId = document.getElementById("team-member-dropdown").value;
        const newEntryOne = {
          teamMemberId : teamMemberId,
          ownershipPercentage : initialOwnershipPercentage,
        };
        ownershipData.push(newEntryOne);
  
        for (i=1; i < amountOfOwners; i++) {

          // initial dropdown id = team-member-dropdown
          // initial textfield id = ownership-percentage
          // initial hidden field id = hidden-ownership-1
          // additional dropdown id = team-member-dropdown-2
          // additional textfield id = ownership-percentage-2
          // additional hidden field id = hidden-ownership-2
  
          const addedOwnershipPercentage = parseFloat(document.getElementById(`ownership-percentage-${i+1}`).value);
          const addedTeamMemberId = document.getElementById(`team-member-dropdown-${i+1}`).value;
          totalPercentage += addedOwnershipPercentage;
  
          const newEntry = {
            teamMemberId : addedTeamMemberId,
            ownershipPercentage : addedOwnershipPercentage,
          };
          ownershipData.push(newEntry);
        }
  
        if (totalPercentage != 100) {
          window.alert(`Total ownership percentage needs to equal 100. The total right now is ${totalPercentage}.`);
        } else {
  
          // make sure the tax id is formatted properly
          const taxIdFeedbackLabelValue = document.getElementById("tax-id-feedback-label");
          if (taxIdFeedbackLabelValue.innerText == "✅ Valid Tax ID") {

            // add the ownership data array to the form data before submission
            const ownershipArrayTextfield = document.getElementById("ownership-array-textfield");
            const finalDict =
              {
                "json" : ownershipData,
              };
            console.log(finalDict);  
            ownershipArrayTextfield.value = JSON.stringify(finalDict);
  
            // hide the submit button when the form gets submitted
            activityFormFakeSubmitButton.style.display = "none";
            activityFormSubmitButton.click();
          } else {
            window.alert(`Tax ID needs to be formatted properly.`);
          }
        }
      });
  
      // hidden form stuff for assign Team Member form
      const assignTeamMemberForm = document.querySelector('#wf-form-Assign-Team-Members');
      const assignFormHiddenTypeField = document.querySelector('#assign-form-type');
      assignTeamMemberForm.addEventListener('submit', function (event) {
        assignFormHiddenTypeField.value = `assign-team-member-form`;
      });
  
      // clear data from assign Team Members popup
      const currentTeamMembersDiv = document.getElementById("current-team-members-div");
      const closeAssignTeamMemberPopupButton = document.getElementById("close-assign-team-member-popup-button");
      closeAssignTeamMemberPopupButton.addEventListener('click', function () {
        currentTeamMembersDiv.replaceChildren();
      });
  
      // toggle switch stuff
      customToggle.addEventListener("change", function (event) {
        if (event.target.checked) {
  
          customToggle.disabled = true;
          lockedString.style.display = "block";
          groupingStatusString.textContent = "Status: Grouped";
  
          // add group to db
          groupAllRentalsForm.submit();
        }
      });
  
      // dropdown for amount of owners for ownership percentage
      amountOfOwnersDropdown.addEventListener("change", function () {
  
        // div to add new data to
        const addedOwnersContainer = document.getElementById("added-owners-container");
        addedOwnersContainer.replaceChildren();
  
        const amountOfOwners = parseInt(this.value);
  
        if (amountOfOwners == 1) {
          addedOwnersContainer.style.display = "none";
        } else {
          for (i=1; i < amountOfOwners; i++) {

            // add additional owner divs
    
            // div for each individual owner
            const individualOwnershipDiv = document.createElement("div");
            individualOwnershipDiv.classList.add("individual-ownership-div");
  
            // select for the Team Member
            const teamMemberOwnershipSelect = document.createElement("select");
            teamMemberOwnershipSelect.classList.add("team-member-dropdown");
            teamMemberOwnershipSelect.classList.add("w-select");
            teamMemberOwnershipSelect.id = `team-member-dropdown-${i+1}`;
            const options = [];
            const values = [];
            for (let key in teamMemberDetails) {
              const teamMemberName = teamMemberDetails[key].name;
              const teamMemberId = key;
              options.push(teamMemberName);
              values.push(teamMemberId);
            }
  
            options.forEach((text, index) => {
              const option = document.createElement("option");
              option.value = values[index];
              option.textContent = text;
              teamMemberOwnershipSelect.appendChild(option);
            });
  
            // sort the dropdown to put main user first
            const optionToMove = Array.from(teamMemberOwnershipSelect.options).find(
              opt => opt.value == targetValue
            );
  
            if (optionToMove) {
              teamMemberOwnershipSelect.removeChild(optionToMove);
              teamMemberOwnershipSelect.insertBefore(optionToMove, teamMemberOwnershipSelect.firstChild);
              teamMemberOwnershipSelect.value = targetValue;
            }
  
            // input for the percentage
            const teamMemberPercentageInput = document.createElement("input");
            teamMemberPercentageInput.classList.add("form-input-field");
            teamMemberPercentageInput.classList.add("w-input");
            teamMemberPercentageInput.id = `ownership-percentage-${i+1}`;
            teamMemberPercentageInput.type = "text";
            teamMemberPercentageInput.placeholder = "Percentage...";
  
            individualOwnershipDiv.appendChild(teamMemberOwnershipSelect);
            individualOwnershipDiv.appendChild(teamMemberPercentageInput);
            addedOwnersContainer.appendChild(individualOwnershipDiv);
  
            addedOwnersContainer.style.display = "flex";
          }
        }
      });
  
      function updateOwnershipDropdowns() {

        const selects = document.querySelectorAll(".team-member-dropdown");
  
        // Get all selected values
        const selectedValues = Array.from(selects)
          .map(s => s.value)
          .filter(v => v); // remove empty
  
        selects.forEach(select => {
          const currentValue = select.value;
          const options = Array.from(select.options);
  
          options.forEach(option => {

            // Always show the empty/default option
            if (option.value === "" || option.value === currentValue) {
              option.disabled = false;
            } else {
              option.disabled = selectedValues.includes(option.value);
            }
          });
        });
      }
  
      // attach event listener to any select with class 'team-member-dropdown'
      document.addEventListener("change", function (e) {
        if (e.target.classList.contains("team-member-dropdown")) {
          updateOwnershipDropdowns();
        }
      });
  
      updateOwnershipDropdowns();
  
      window.$memberstackDom.getCurrentMember().then(({ data: member }) => {
        if (member) {
          const userEmail = member.auth.email;
          fetchAirtableUserID(userEmail)
            .then((airtableUserID) => {
              if (airtableUserID) {
                fetchUserActivities(airtableUserID);
                fetchTeamMemberDetails(airtableUserID);
                activitiesLoadingDiv.style.display = "none";
              } else {
                console.error("error with Airtable");
              }
            })
            .catch((error) => {
              console.error("Error retrieving the logged-in user's email:", error);
          });
        }
      });
  
    });
  
    async function fetchAirtableUserID(email) {
      const airtableApiUrl = `https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Users?filterByFormula={Email}="${email}"`;
  
      try {
        const response = await fetch(airtableApiUrl, {
          headers: {
            Authorization: "Bearer patSuO07S3t9lyKXO.0f279eed33a5d602727ad92819a9b9cfdf690d4179830edc5213baca03891485", // Replace with your PAT
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          throw new Error(`error: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.records.length > 0) {
          // grouping stuff
          const groupingAllRentalActivities = data.records[0].fields["Group All Rentals"];
          if (groupingAllRentalActivities == "TRUE") {
            const groupingStatusString = document.querySelector('#grouping-status-string');
            groupingStatusString.textContent = "Status: All Rentals Grouped";
            const groupRentalsSubmitButton = document.querySelector('#group-rentals-submit-button');
            groupRentalsSubmitButton.disabled = true;
            groupRentalsSubmitButton.style.display = "none";
            const allRentalsGroupNameTextfield = document.querySelector('#all-rentals-group-name');
            allRentalsGroupNameTextfield.disabled = true;
            allRentalsGroupNameTextfield.style.display = "none";
            const lockedString = document.querySelector('#locked-string');
            lockedString.style.display = "block";
          }
        } else {
          return null;
        }
        
        return data.records[0].fields["ID"];
        
      } catch (error) {
        console.error("Error fetching Airtable User ID:", error);
        return null;
      }
    }
  
    // function to get Team Member details
    async function fetchTeamMemberDetails(userID) {
  
      const airtableApiUrl = `https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Team%20Members?filterByFormula={Users}="${userID}"`;
  
      try {
  
        // fetch team members from Airtable
        const response = await fetch(airtableApiUrl, {
          headers: {
            Authorization: "Bearer patSuO07S3t9lyKXO.0f279eed33a5d602727ad92819a9b9cfdf690d4179830edc5213baca03891485",
            "Content-Type": "application/json",
          },
        });
  
        if (!response.ok) {
          throw new Error(`Airtable API error: ${response.statusText}`);
        }
  
        const data = await response.json();
  
        const initialTeamMemberDropdown = document.getElementById("team-member-dropdown");
        const editFirstTeamMemberDropdown = document.getElementById("edit-team-member-dropdown-1");
        initialTeamMemberDropdown.replaceChildren();
        editFirstTeamMemberDropdown.replaceChildren();
  
        // fill the data struct with Team Member details
        if (data.records && data.records.length > 0) {
          data.records.forEach((record, index) => {
  
            // if Team Member is 'deleted', skip
            if (record.fields["Deleted"] == 'TRUE') {
              return;
            }
  
            if (record.fields["Role"] == "Main User") {
              const hiddenUserTeamMemberId = document.querySelector('#user-team-member-id');
              hiddenUserTeamMemberId.value = record.id;
              targetValue = record.id;
            }
  
            teamMemberDetails[record.id] =
              {
                name: record.fields["Full Name"],
                assignments: record.fields["Assignments"] || [],
                activities: record.fields["Activity (from Assignments)"] || [],
                role: record.fields["Role"],
              };
  
              // add options to Team Member ownership dropdown
              const option1 = document.createElement("option");
              option1.value = record.id;
              option1.textContent = record.fields["Full Name"];
              const option2 = option1.cloneNode(true);
              initialTeamMemberDropdown.appendChild(option1);
              editFirstTeamMemberDropdown.appendChild(option2);
          });
  
          const optionToMove = Array.from(initialTeamMemberDropdown.options).find(
            opt => opt.value == targetValue
          );
  
          if (optionToMove) {
            initialTeamMemberDropdown.removeChild(optionToMove);
            const clonedOption = optionToMove.cloneNode(true);
            initialTeamMemberDropdown.insertBefore(optionToMove, initialTeamMemberDropdown.firstChild);
            editFirstTeamMemberDropdown.insertBefore(clonedOption, editFirstTeamMemberDropdown.firstChild);
            initialTeamMemberDropdown.value = targetValue;
            editFirstTeamMemberDropdown.value = targetValue;
          }

          console.log("Details fetched successfully.");
  
        } else {
          console.warn("No Team Members found for this user.");
        }
      } catch (error) {
        console.error("Error fetching Team Member details:", error);
      }
    }
  
    // function to restore ALL deleted Activities
    const restoreActivitiesButton = document.getElementById("restore-deleted-activities");
    restoreActivitiesButton.addEventListener("click", async function () {
  
      const confirmRestore = confirm("Are you sure you want to restore ALL Activities?");
      if (!confirmRestore) return;

      // query the Airtable Activities table
      // change Deleted to FALSE for all user records
  
      // user doesn't have any Activities to restore
      if (userActivityIDs.length === 0) {
          alert("No Activities to restore.");
          return;
      }
  
      const airtableApiUrlForRestore = `https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Activities/`;
  
      const updatePayload = {
          records: userActivityIDs.map(id => ({
              id: id,
              fields: { Deleted: "FALSE" }
          }))
      };
  
      const restoreResponse = await fetch(airtableApiUrlForRestore, {
          method: "PATCH",
          headers: {
              "Authorization": `Bearer patSuO07S3t9lyKXO.0f279eed33a5d602727ad92819a9b9cfdf690d4179830edc5213baca03891485`,
              "Content-Type": "application/json"
          },
          body: JSON.stringify(updatePayload)
      });
  
      if (restoreResponse.ok) {
        console.log("Activities restored successfully!");
      } else {
        console.log("Error restoring Activities.");
      }
  
    });
  
    // function to get a random color
    function getDistinctColor(i, total) {
      const funColors = ["#f09090","#ebbc71","#a4eb71","#71ebb4","#71dfeb","#71a2eb","#9d98eb","#e8b2ed","#faafca","#ebf065","#7dc98c","#67d0f0"];
      const randomFunColor = funColors[Math.floor(Math.random() * funColors.length)];
      return randomFunColor;
    }

    // get all the user's Activities data
    async function fetchActivityOwnershipDetails(activityOwnershipIDs) {
      const fetchPromises = activityOwnershipIDs.map(id =>
        fetch(`https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Activity%20Ownership/${id}`, {
          headers: {
            Authorization: `Bearer patSuO07S3t9lyKXO.0f279eed33a5d602727ad92819a9b9cfdf690d4179830edc5213baca03891485`,
            "Content-Type": "application/json"
          }
        }).then(res => res.json())
      );
      return await Promise.all(fetchPromises);
    }
  
    async function fetchUserActivities(userID) {
  
      const airtableApiUrl = `https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Activities?filterByFormula={Users}="${userID}"`;
      const noActivitiesDiv = document.querySelector('#no-activities-div');
      const activitiesDisplaySection = document.querySelector('#activities-display-section');
  
      try {
        // Fetch User's Activities from Airtable
        const response = await fetch(airtableApiUrl, {
          headers: {
            Authorization: "Bearer patSuO07S3t9lyKXO.0f279eed33a5d602727ad92819a9b9cfdf690d4179830edc5213baca03891485",
            "Content-Type": "application/json",
          },
        });
  
        if (!response.ok) {
          throw new Error(`Airtable API error: ${response.statusText}`);
        }
  
        const data = await response.json();
        const selectElement = document.getElementById("activities-group-selection");
        // allow multiple selections
        selectElement.setAttribute("multiple", "multiple");
  
        // Display Activities
        if (data.records && data.records.length > 0) {
          data.records.forEach(record => {
  
            // add all Activity record IDs to userActivityIDs array
            userActivityIDs.push(record.id);
  
            // if the Activity is 'deleted', don't show it in results
            if (record.fields["Deleted"] == "TRUE") {
  
              // if there are any deleted Activities, show the restore button
              const restoreDeletedActivitiesDiv = document.getElementById("restore-deleted-activities-div");
              restoreDeletedActivitiesDiv.style.display = "flex";
  
              return;
            }

            // stuff for the individual grouping popup form ---------------
    
            // only add the record if it is NOT already in a group
            if (record.fields["Activities Group"] && record.fields["Activities Group"].length > 0) {
              //console.log("in group");
              //console.log(record.fields["Name"]);
  
            } else {

              const option = document.createElement("option");
              option.value = record.id;
              option.textContent = record.fields["Name"];
              selectElement.appendChild(option);
            }
    
            // end popup form stuff -------------------------------------------
            const newActivityDiv = document.createElement("div");
            newActivityDiv.classList.add("display-div");
            newActivityDiv.classList.add("activity");
  
            const activityText = document.createElement("p");
            activityText.classList.add("display-text");
            const activityName = record.fields["Name"];
  
            if (activityName) {
              if (record.fields["Name (from Activities Group)"]) {
                const groupName = record.fields["Name (from Activities Group)"][0];
                const nameAndGroup = activityName + " | Group: " + groupName;
                activityText.textContent = nameAndGroup;
                newActivityDiv.appendChild(activityText);
              } else {
                activityText.textContent = activityName;
                newActivityDiv.appendChild(activityText);
              }
            }
  
            // grab the Activity type
            const activityTypeElement = document.createElement("p");
            activityTypeElement.style.fontSize = "12px";
            activityTypeElement.style.marginLeft = "20px";
            const activityType = record.fields["Type"];
            const tempTypeString = 'Type: ';
            const finalTypeString = tempTypeString + activityType;
  
            if (activityType) {
              activityTypeElement.textContent = finalTypeString;
              newActivityDiv.appendChild(activityTypeElement);
            }
  
            // check if there is a address and create element
            if ("Address" in record.fields) {
              const activityAddress = record.fields["Address"];
              const tempAddressString = 'Address: ';
              const finalAddressString = tempAddressString + activityAddress;
              const activityAddressElement = document.createElement("p");
              activityAddressElement.style.fontSize = "12px";
              activityAddressElement.style.marginLeft = "20px";
              activityAddressElement.textContent = finalAddressString;
              newActivityDiv.appendChild(activityAddressElement);
            }
  
            // check if there is an EIN and create element
            if ("EIN" in record.fields) {
              const activityEIN = record.fields["EIN"].toString();
              const tempEIN = `${activityEIN.slice(0, 2)}-${activityEIN.slice(2)}`;
              const tempString = 'EIN: ';
              const formattedEIN = tempString + tempEIN;
              const activityEINElement = document.createElement("p");
              activityEINElement.style.fontSize = "12px";
              activityEINElement.style.marginLeft = "20px";
              activityEINElement.textContent = formattedEIN;
              newActivityDiv.appendChild(activityEINElement);
            }
  
            // add a soft delete button
            const deleteActivityButton = document.createElement("button");
            deleteActivityButton.innerText = "Delete";
            deleteActivityButton.classList.add("delete-activity-button");
            // for the delete button id I am using the Activity ID so we
            // know what to delete
            deleteActivityButton.id = record.id;
            newActivityDiv.appendChild(deleteActivityButton);
  
            // function for the delete Activity button
            deleteActivityButton.addEventListener("click", async function () {
  
              const confirmDelete = confirm("Are you sure you want to delete this Activity?");
              if (!confirmDelete) return;
  
              // query the Airtable Activities table
              // change Deleted to TRUE
              const activityRecordId = deleteActivityButton.id;
              const airtableApiUrlForUpdates = `https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Activities/${activityRecordId}`;
              const updatedFields = { Deleted: "TRUE" };
  
              const updateResponse = await fetch(airtableApiUrlForUpdates, {
                  method: "PATCH",
                  headers: {
                      "Authorization": `Bearer patSuO07S3t9lyKXO.0f279eed33a5d602727ad92819a9b9cfdf690d4179830edc5213baca03891485`,
                      "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                      fields: updatedFields
                  })
              });
  
              if (updateResponse.ok) {
                console.log("Activity updated successfully!");
              } else {
                console.log("Error updating activity.");
              }
            });

            // edit button
            const editActivityButton = document.createElement("button");
            editActivityButton.innerText = "Edit";
            editActivityButton.classList.add("edit-time-entry-button");
            editActivityButton.id = "edit-" + record.id;

            // radio button functions
            const editRentalRadio = document.getElementById("edit-rental-radio");
            const editTradeOrBusinessRadio = document.getElementById("edit-trade-business-radio");
            const currentDescriptionLabel = document.getElementById("current-description-label");
            const currentAddressLabel = document.getElementById("current-address-label");
            const editTradeOrBusinessNoRadio = document.getElementById("edit-trade-or-business-radio-no");
            const editTradeOrBusinessYesRadio = document.getElementById("edit-trade-or-business-radio-yes");
            const editTradeBusinessSelections = document.getElementById("edit-trade-business-selections");

            editRentalRadio.addEventListener("change", function() {
                if (editRentalRadio.checked) {
                    editTradeOrBusinessRadio.checked = false;
                    currentDescriptionLabel.innerText = "Current Rental Description:";
                    currentAddressLabel.innerText = "Current Rental Address:";
                } else {
                    editTradeOrBusinessRadio.checked = true;
                    currentDescriptionLabel.innerText = "Current Business Name:";
                    currentAddressLabel.innerText = "Current Business Address:";
                }
            })

            editTradeOrBusinessRadio.addEventListener("change", function() {
                if (editTradeOrBusinessRadio.checked) {
                    editRentalRadio.checked = false;
                    currentDescriptionLabel.innerText = "Current Business Name:";
                    currentAddressLabel.innerText = "Current Business Address:";
                } else {
                    editRentalRadio.checked = true;
                    currentDescriptionLabel.innerText = "Current Rental Description:";
                    currentAddressLabel.innerText = "Current Rental Address:";
                }
            })

            editTradeOrBusinessNoRadio.addEventListener("change", function() {
                if (editTradeOrBusinessNoRadio.checked) {
                    editTradeOrBusinessYesRadio.checked = false;
                    editTradeBusinessSelections.style.display = "none";
                } else {
                    editTradeOrBusinessYesRadio.checked = true;
                    editTradeBusinessSelections.style.display = "flex";
                }
            })

            editTradeOrBusinessYesRadio.addEventListener("change", function() {
                if (editTradeOrBusinessYesRadio.checked) {
                    editTradeOrBusinessNoRadio.checked = false;
                    editTradeBusinessSelections.style.display = "flex";
                } else {
                    editTradeOrBusinessNoRadio.checked = true;
                    editTradeBusinessSelections.style.display = "none";
                }
            }) 

            const amountOfOwnersDropdown = document.getElementById("amount-of-owners-dropdown");
            amountOfOwnersDropdown.addEventListener("change", function() {
                const editAddedOwnersContainer = document.getElementById("edit-added-owners-container");
                editAddedOwnersContainer.replaceChildren();
                const selectedOwnersCount = parseInt(this.value);
                if (selectedOwnersCount == 1) {
                    editAddedOwnersContainer.style.display = "none";
                } else {
                  createOwnershipInputs(1, selectedOwnersCount, "edit-added-owners-container");
                }
            })

            editActivityButton.addEventListener("click", async function () {
                
                const editPopupBackground = document.getElementById("edit-activity-background");
                editPopupBackground.style.display = "flex";
                editPopupBackground.style.opacity = "100%";

                // type -> rental or trade/business
                const currentTypeLabel = document.getElementById("current-type-label");
                const editActivityType = record.fields["Type"];
                if (editActivityType == "Rental") {
                  currentTypeLabel.innerText = "Current Type:";
                  editRentalRadio.checked = true;
                  editTradeOrBusinessRadio.checked = false;
                } else {
                  currentTypeLabel.innerText = "Current Type:";
                  editRentalRadio.checked = false;
                  editTradeOrBusinessRadio.checked = true;
                }

                // description
                const editActivityDescription = record.fields["Name"];
                const editDescriptionInput = document.getElementById("edit-description");
                if (editActivityType == "Rental") {
                  currentDescriptionLabel.innerText = "Current Rental Description:";
                } else {
                  currentDescriptionLabel.innerText = "Current Business Name:";
                }
                editDescriptionInput.value = editActivityDescription;

                // address
                const editActivityAddress = record.fields["Address"];
                const editAddressInput = document.getElementById("edit-address");
                if (editActivityType == "Rental") {
                  currentAddressLabel.innerText = "Current Rental Address:";
                } else {
                  currentAddressLabel.innerText = "Current Business Address:";
                }
                editAddressInput.value = editActivityAddress;

                // tax ID
                const currentTaxIDLabel = document.getElementById("current-tax-id-label");
                const editTaxIDInput = document.getElementById("edit-tax-id");
                const editActivityTaxID = record.fields["EIN"];
                currentTaxIDLabel.innerText = "Current Tax ID (EIN or SSN):";
                editTaxIDInput.value = editActivityTaxID;

                // ownership percentages
                // activity ownerships are its own table
                const currentOwnershipPercentagesLabel = document.getElementById("current-ownership-percentages-label");
                const amountOfOwnersDropdown = document.getElementById("amount-of-owners-dropdown");
                amountOfOwnersDropdown.innerHTML = "";
                const activityOwnershipIDs = record.fields["Activity Ownership"];
                currentEditingOwnershipIDs = [...activityOwnershipIDs];
                const amountOfOwners = activityOwnershipIDs.length;
                const amountOfTeamMembers = Object.keys(teamMemberDetails).length;
                
                for (i=1; i <= amountOfTeamMembers; i++) {
                  const newOption = document.createElement("option");
                  newOption.value = i;
                  newOption.textContent = i;
                  if (i == (amountOfOwners)) {
                    newOption.selected = true;
                  }
                  amountOfOwnersDropdown.appendChild(newOption);
                }

                const editAddedOwnersContainer = document.getElementById("edit-added-owners-container");
                editAddedOwnersContainer.replaceChildren();

                if (amountOfOwners > 1) {
                  createOwnershipInputs(1, amountOfOwners, "edit-added-owners-container");
                }
                
                const ownershipDetails = await fetchActivityOwnershipDetails(activityOwnershipIDs);
                for (i=0; i < ownershipDetails.length; i++) {
                  const owner = ownershipDetails[i].fields["Team Member"][0];
                  const ownerPercentage = ownershipDetails[i].fields["Ownership Percentage"];
                  const dropdownID = `edit-team-member-dropdown-${i+1}`;
                  const percentageID = `edit-ownership-percentage-${i+1}`;
                  const editTeamMemberDropdown = document.getElementById(dropdownID);
                  const editOwnershipPercentage = document.getElementById(percentageID);
                  editOwnershipPercentage.value = ownerPercentage;
                  for (let option of editTeamMemberDropdown.options) {
                    if (option.value == owner) {
                      editTeamMemberDropdown.value = owner;
                      break;
                    }
                  }
                }
                
                // real estate trade or business
                const currentIsTradeOrBusinessLabel = document.getElementById("current-is-trade-business-label");
                const editTradeOrBusinessList = document.getElementById("edit-trade-business-selection-list");
                const editTradeOrBusiness = record.fields["Real Estate Trade Or Business"];
                if (editTradeOrBusiness == "TRUE") {

                    // trade or business selections is 'yes'
                    currentIsTradeOrBusinessLabel.innerText = "Currently a Real Estate Trade or Business:";
                    editTradeOrBusinessYesRadio.checked = true;
                    editTradeOrBusinessNoRadio.checked = false;

                    editTradeBusinessSelections.style.display = "block";
                    const currentTradeOrBusinessList = record.fields["Trade Or Business Selections"];

                    // add current Activity selections
                    for (let i=0; i < editTradeOrBusinessList.options.length; i++) {
                        const option = editTradeOrBusinessList.options[i];
                        if (currentTradeOrBusinessList.includes(option.value)) {
                            option.selected = true;
                        } else {
                            option.selected = false;
                        }
                    }

                } else {
                    currentIsTradeOrBusinessLabel.innerText = "Currently a Real Estate Trade or Business:";
                    editTradeOrBusinessYesRadio.checked = false;
                    editTradeOrBusinessNoRadio.checked = true;
                    editTradeBusinessSelections.style.display = "none";
                }

                const activityRecordId = document.getElementById("activity-record-id");
                activityRecordId.value = record.id;

            });

            newActivityDiv.appendChild(editActivityButton);

            const submitEditsButton = document.getElementById("edit-form-submit-button");
            submitEditsButton.onclick = null;
            submitEditsButton.onclick = async function () {

              let newType = "Trade/Business";
              const rentalRadioSelected = document.getElementById("edit-rental-radio").selected;
              if (rentalRadioSelected) {
                newType = "Rental";
              }
              const newDescription = document.getElementById("edit-description").value;
              const newAddress = document.getElementById("edit-address").value;
              const newTaxID = document.getElementById("edit-tax-id").value;
              
              let newTradeOrBusiness = "TRUE";
              let newSelections = [];
              const noTradeOrBusinessRadio = document.getElementById("edit-trade-or-business-radio-no").checked;
              if (noTradeOrBusinessRadio) {
                newTradeOrBusiness = "FALSE";
              }

              if (newTradeOrBusiness == "TRUE") {
                const selectionDropdown = document.getElementById("edit-trade-business-selection-list");
                for (let i=0; i < selectionDropdown.options.length; i++) {
                  const option = selectionDropdown.options[i];
                  if (option.selected) {
                    newSelections.push(option.value);
                  }
                }
              }

              if (newDescription == "") {
                alert("Fill in the form properly.");
                return;
              }

              const newOwnershipData = [];
              let totalPercentages = 0;
              const amountOfNewOwners = document.getElementById("amount-of-owners-dropdown").value;

                for (let i=0; i < amountOfNewOwners; i++) {
                  const newTeamMemberID = document.getElementById(`edit-team-member-dropdown-${i + 1}`).value;
                  const newPercentage = parseFloat(document.getElementById(`edit-ownership-percentage-${i + 1}`).value);
                  newOwnershipData.push({ newTeamMemberID, newPercentage });
                  totalPercentages += newPercentage;
                }
                if (totalPercentages != 100) {
                  alert(`Ownership total must equal 100%. Current total: ${totalPercentage}`);
                  return;
                }

              const activityRecordId = document.getElementById("activity-record-id").value;
              const airtableApiUrlForUpdates = `https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Activities/${activityRecordId}`;
              const updatedFields = { 
                "Type": newType,
                "Name": newDescription,
                "Address": newAddress,
                "EIN": newTaxID,
                "Real Estate Trade Or Business": newTradeOrBusiness,
                "Trade Or Business Selections": newSelections,
              };
              
              const updateResponse = await fetch(airtableApiUrlForUpdates, {
                method: "PATCH",
                headers: {
                  "Authorization": `Bearer patSuO07S3t9lyKXO.0f279eed33a5d602727ad92819a9b9cfdf690d4179830edc5213baca03891485`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  fields: updatedFields
                })
              });
              const responseDiv = document.getElementById("edit-response-div");
              const editActivityDetailsDiv = document.getElementById("edit-activity-details-div");
              if (updateResponse.ok) {
                editActivityDetailsDiv.style.display = "none";
                responseDiv.style.display = "flex";
              } else {
                editActivityDetailsDiv.style.display = "none";
                const errorDetails = await updateResponse.json();
                const responseLabel = document.getElementById("edit-response-label");
                responseLabel.innerText = "Error submitting edits: " + errorDetails;
                responseDiv.style.display = "flex";
              }
              
              const ownershipUpdates = [];
              const newOwnersIDs = [];
              const newAmountOfOwners = document.getElementById("amount-of-owners-dropdown").value;
              for (i=0; i < newAmountOfOwners; i++) {
                const newOwnerID = document.getElementById(`edit-team-member-dropdown-${i+1}`).value;
                newOwnersIDs.push(newOwnerID);
                const teamMemberDropdown = document.getElementById(`edit-team-member-dropdown-${i + 1}`);
                const percentageInput = document.getElementById(`edit-ownership-percentage-${i + 1}`);
                const teamMemberId = newOwnersIDs[i];
                const ownershipPercentage = parseFloat(percentageInput.value);
                ownershipUpdates.push({
                  id: currentEditingOwnershipIDs[i],
                  fields: {
                    "Team Member": [teamMemberId],
                    "Ownership Percentage": ownershipPercentage,
                    "Activity": [activityRecordId],
                  }
                });
              }
              const newOwnershipRecords = newOwnersIDs.map((id, i) => ({
                fields: {
                  "Team Member": [id],
                  "Ownership Percentage": parseFloat(document.getElementById(`edit-ownership-percentage-${i + 1}`).value),
                  "Activity": [activityRecordId]
                }
              }));
                
              await Promise.all(currentEditingOwnershipIDs.map(id =>
                fetch(`https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Activity%20Ownership/${id}`, {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer patSuO07S3t9lyKXO.0f279eed33a5d602727ad92819a9b9cfdf690d4179830edc5213baca03891485`,
                    "Content-Type": "application/json"
                  }
                })
              ));
              await fetch(`https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Activity%20Ownership`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer patSuO07S3t9lyKXO.0f279eed33a5d602727ad92819a9b9cfdf690d4179830edc5213baca03891485`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ records: newOwnershipRecords })
              });
            };

            // add a button to allow the user to assign Team Members to Activities
            const assignTeamMemberButton = document.createElement("button");
            assignTeamMemberButton.innerText = "View / Assign Team Members to this Activity";
            assignTeamMemberButton.classList.add("assign-team-member-button");
            assignTeamMemberButton.id = record.id + "-assign";
            newActivityDiv.appendChild(assignTeamMemberButton);
  
            // function for the assign Team Member button
            assignTeamMemberButton.addEventListener("click", async function () {

              // show the assign Team Member popup
              const assignTeamMemberPopup = document.getElementById("assign-team-member-popup-background");
              assignTeamMemberPopup.style.display = "flex";
              assignTeamMemberPopup.style.opacity = "100%";

              // assign hidden textfield the Activity Id
              const activityIdTextfield = document.getElementById("activity-id-textfield");
              const buttonId = assignTeamMemberButton.id;
              const activityId = buttonId.replace("-assign", "");
              activityIdTextfield.value = activityId;

              // change the main popup label
              const assignTeamMemberMainLabel = document.getElementById("assign-team-members-main-label");
              assignTeamMemberMainLabel.innerText = "Add Team Member to: " + record.fields["Name"];

              // populate the Team Member dropdown
              const assignTeamMemberDropdown = document.getElementById("assign-team-member-dropdown");

              // clear existing options from dropdown
              assignTeamMemberDropdown.innerHTML = "";

              // add a default option
              const defaultOption = document.createElement("option");
              defaultOption.value = "";
              defaultOption.textContent = "Choose a Team Member";
              assignTeamMemberDropdown.appendChild(defaultOption);

              // don't show Team Members already assigned to the current Activity
              // go through teamMemberDetails
              // if Team Member is not part of this Activity, add to dropdown

              const currentTeamMembersDiv = document.getElementById("current-team-members-div");
              for (let key in teamMemberDetails) {

                const teamMemberActivities = teamMemberDetails[key].activities;

                // if Team Member is NOT Assigned to the current Activity
                if (!teamMemberActivities.includes(activityId)) {

                  // add Team Member to dropdown
                  const newOption = document.createElement("option");
                  newOption.value = key;
                  newOption.textContent = teamMemberDetails[key].name;
                  assignTeamMemberDropdown.appendChild(newOption);
  
                } else {

                  // add Team Member to the already in Activity display
                  // TODO: going to just add as a label for now - maybe use a list or something
                  const newLabel = document.createElement("label");
                  newLabel.innerText = teamMemberDetails[key].name;
                  currentTeamMembersDiv.appendChild(newLabel);
                }
              }
            });
  
            // display details on if this Activity is a real estate trade or business
            if (record.fields["Real Estate Trade Or Business"] == "TRUE") {
              const realEstateTradeOrBusinessDiv = document.createElement("div");
              realEstateTradeOrBusinessDiv.style.padding = "20px";
              const displayLabel = document.createElement("label");
              displayLabel.style.fontSize = "14px";
              displayLabel.style.margin = "5px";
              displayLabel.style.color = "#2b2b2b";
              displayLabel.innerText = "This Activity is a Real Estate Trade or Business:";
              realEstateTradeOrBusinessDiv.appendChild(displayLabel);
              const selections = record.fields["Trade Or Business Selections"];
              for (i=0; i < selections.length; i++) {
                const selectionLabel = document.createElement("label");
                selectionLabel.style.padding = "5px 10px";
                selectionLabel.style.margin = "10px";
                selectionLabel.style.fontSize = "12px";
                selectionLabel.style.width = "150px";
                selectionLabel.style.borderRadius = "20px";
                selectionLabel.style.textAlign = "center";
                selectionLabel.innerText = selections[i];
                const randomColor = getDistinctColor(i, selections.length);
                selectionLabel.style.backgroundColor = randomColor;
                selectionLabel.style.color = "#2b2b2b";
                realEstateTradeOrBusinessDiv.appendChild(selectionLabel);
              }
              newActivityDiv.appendChild(realEstateTradeOrBusinessDiv);
            }
  
            // add to the activity display section
            if (activitiesDisplaySection) {
              activitiesDisplaySection.appendChild(newActivityDiv);
            } else {
              console.error("Section with ID 'activities-display-section' not found.");
            }
          });
          console.log("Activity displayed successfully.");
  
        } else {  
          noActivitiesDiv.style.display = "flex";
          console.warn("No activities found.");
        }
  
        $('option').mousedown(function (e) {
          e.preventDefault();
          $(this).prop('selected', !$(this).prop('selected'));
        });
      } catch (error) {
        console.error("Error fetching activities:", error);
  
      }
      }
  
      // show details when hovering over a select item
    const selection = document.getElementById("trade-or-business-values");
    selection.addEventListener("mouseover", () => {
      const hoveredOption = selection.options[selection.selectedIndex].value;
    });
  
  </script>
  
  <script
    src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDRxBg5KJUHP7Se2cHQGh-LDUzG2M5NczI&callback=initAutocomplete&libraries=places&v=weekly"
    defer
  ></script>
  
