

  // to store all user Time Entry IDs
  // this way I can easily restore all of them if the user decides
  // to restore soft deleted Time Entries
  let userTimeEntryIDs = [];

  // for calendar
  let timeEntryDetails = [];
  let userTimeZone = "America/Los_Angeles";

  document.addEventListener('DOMContentLoaded', function () {

  	const form = document.querySelector('#wf-form-new-time-entry-form');
    const teamMemberInput = document.querySelector('input[name="team-member-input"]');
    const teamMemberName = document.querySelector('#team-member-name');
    const dateFieldInput = document.querySelector('#date-time-input');
    const dateValue = document.querySelector('input[name="date-input"]');
    const userTimeZoneField = document.getElementById("user-time-zone-field");
    const hoursField = document.querySelector('input[name="hours"]');
    const minutesField = document.querySelector('input[name="minutes"]');
    const hiddenTimeField = document.querySelector('input[name="time-string"]');
    const hiddenTypeField = document.querySelector('#form-type');
    const hiddenUserInputField = document.querySelector('#hidden-user-input');
    const teamMemberDropdown = document.getElementById("team-member-dropdown-2");
    const noTimeEntriesDiv = document.querySelector('#no-time-entries-div');
    const activitiesLoadingDiv = document.querySelector('#time-entries-loading-div');
    const restoreDeletedTimeEntriesDiv = document.getElementById("restore-deleted-time-entries-div");
    const calendarSection = document.getElementById("calendar-section");
    const mainSection = document.getElementById("time-entries-display-section");
    const toggleSwitchSection = document.getElementById("toggle-switch-section");
    const refreshPageButton = document.getElementById("refresh-time-entries-page-button");
    const expandDiv = document.getElementById("expand-div");
    const teamMemberSelectionDiv = document.getElementById("team-member-selection-div");
    const teamMemberCalendarForm = document.getElementById("wf-form-team-member-calendar-form");

    noTimeEntriesDiv.style.display = "none";
    activitiesLoadingDiv.style.display = "flex";
    restoreDeletedTimeEntriesDiv.style.display = "none";
    mainSection.style.display = "none";
    toggleSwitchSection.style.display = "none";
    teamMemberCalendarForm.style.display = "none";

     window.$memberstackDom.getCurrentMember().then(({ data: member }) => {
        if (member) {

          const userEmail = member.auth.email;

          fetchAirtableUserID(userEmail)
          	.then((airtableUserID) => {
            	if (airtableUserID) {

              	hiddenUserInputField.value = airtableUserID;

                fetchCustomUserID(airtableUserID).then((customUserID) => {

                	if (customUserID) {

                    fetchAndPopulateDropdown(customUserID)
                      .then(() => populateActivityDropdown(customUserID))
                      .then(() => populateCategoryDropdown(customUserID))
                      .then(() => fetchUserTimeEntries(customUserID))
                      .then(() => {
                          activitiesLoadingDiv.style.display = "none";
                          toggleSwitchSection.style.display = "flex";
                          mainSection.style.display = "flex";
                      })
                      .then(() => createCalendar())
                      .catch(error => console.error("Error", error));

                  } else {
                    console.error("No custom User ID.");
                  }
                })
            	} else {
            		console.error("No Airtable User ID.");
           	 	}
           })
           .catch((error) => {
             console.error("Error retrieving email:", error);
           });
       }
    });

    refreshPageButton.addEventListener("click", () => {
      location.reload();
    });

    // expand and collapse team member selection for calendar view
    expandDiv.addEventListener("click", () => {

      // check if it is currently expanded or collapsed
      const divHeight = teamMemberSelectionDiv.style.height;

      const expandArrowLabel = document.getElementById("expand-arrow-label");

      if (divHeight == "0px") {

        expandDiv.style.borderBottom = "none";
        expandDiv.style.borderRadius = "10px 10px 0px 0px";
        teamMemberSelectionDiv.style.transition = "height 5.5s ease";
        teamMemberSelectionDiv.style.height = "auto";
        teamMemberSelectionDiv.style.display = "flex";
        expandArrowLabel.innerText = '⬆';

      } else {

        expandDiv.style.borderBottom = "0.5px solid rgba(0, 0, 0, 0.65)";
        expandDiv.style.borderRadius = "10px";
        teamMemberSelectionDiv.style.transition = "height 0.5s ease";
        teamMemberSelectionDiv.style.height = "0px";
        teamMemberSelectionDiv.style.display = "none";
        expandArrowLabel.innerText = '⬇';
      }
    });

    // update the calendar with selected Team Members
    document.getElementById("update-calendar-button").addEventListener("click", () => {

      // get selected Team Member IDs
      const teamMemberNames = Array.from(
        document.querySelectorAll('input[name="team-member"]:checked')
      ).map(box => box.value);

      // update calendar
      calendar.removeAllEvents();

      const newEvents = [];
      for (i=0; i < timeEntryDetails.length; i++) {
        let targetName = timeEntryDetails[i]["team member"];
        if (Array.isArray(targetName)) {
          targetName = targetName[0];
        }
        if (teamMemberNames.includes(targetName)) {
          newEvents.push(timeEntryDetails[i]);
        }
      }
      calendar.addEventSource(newEvents);

      // retract the dropdown
      expandDiv.click();
    });

    const toggleButton = document.getElementById("toggle-switch-button");
    toggleButton.addEventListener("click", () => {
      const currentText = toggleButton.innerText;
      if (currentText == "View Calendar") {
        toggleButton.innerText = "View List";
        calendarSection.style.display = "block";
        teamMemberCalendarForm.style.display = "block";
        mainSection.style.display = "none";
      } else {
        toggleButton.innerText = "View Calendar";
        calendarSection.style.display = "none";
        teamMemberCalendarForm.style.display = "none";
        mainSection.style.display = "flex";
      }
    });

    // Handle dropdown change event
    teamMemberDropdown.addEventListener("change", (event) => {
      const selectedOption = event.target.options[event.target.selectedIndex];
      const selectedImageUrl = selectedOption.getAttribute("data-image-url");
      const imgElement = document.getElementById("team-member-image");

      if (selectedImageUrl) {
        imgElement.src = selectedImageUrl;
      } else {
        imgElement.src = "";
      }
    });

    // Listen for the form's submit event
    form.addEventListener('submit', function (event) {

      teamMemberInput.value = teamMemberName.textContent.trim();
      userTimeZoneField.value = userTimeZone;
      dateValue.value = dateFieldInput.value;

      const hours = hoursField.value.padStart(2, '0');
      const minutes = minutesField.value.padStart(2, '0');

      let hoursInSeconds = hoursField.value * 3600;
      let minutesInSeconds = minutesField.value * 60;
      let totalSeconds = hoursInSeconds + minutesInSeconds;

      hiddenTimeField.value = totalSeconds;
      hiddenTypeField.value = `new-time-entry-form`;

    });

    let startTime;
  	let timerInterval;
  	const timerDisplay = document.getElementById('time');
  	const startButton = document.getElementById('start-timer');
  	const stopButton = document.getElementById('stop-timer');
  	const resetButton = document.getElementById('reset-timer');
  	const updateHoursField = document.querySelector('input[name="hours"]');
    const updateMinutesField = document.querySelector('input[name="minutes"]');

    // Format time as HH:MM:SS
    function formatTime(elapsedMilliseconds) {
      const totalSeconds = Math.floor(elapsedMilliseconds / 1000);
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');

      return {
        hours: hours,
        minutes: minutes,
        seconds: seconds,
      };
    }

    // Start the timer
    startButton.addEventListener('click', function () {
      startTime = Date.now();
      timerInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const { hours, minutes, seconds } = formatTime(elapsedTime);
        timerDisplay.textContent = `${hours}:${minutes}:${seconds}`;
      }, 1000);

      startButton.disabled = true;
      stopButton.disabled = false;
    });

    // Stop the timer and populate the form
    stopButton.addEventListener('click', function () {

    	// stop timer
      clearInterval(timerInterval);
      const elapsedTime = Date.now() - startTime;
      const { hours, minutes } = formatTime(elapsedTime);

      timerDisplay.textContent = "00:00:00";

      // add in time to the form
      if (updateHoursField) {
        updateHoursField.value = hours;
      }
      if (updateMinutesField) {
        updateMinutesField.value = minutes;
      }

      startButton.disabled = false;
      stopButton.disabled = true;
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
        throw new Error(`Airtable API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Return the Airtable Record ID of the user
      return data.records.length > 0 ? data.records[0].id : null;

    } catch (error) {
      console.error("Error fetching Airtable User ID:", error);
      return null;
    }
  }


  async function fetchCustomUserID(recordID) {
    const airtableApiUrl = `https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Users/${recordID}`;

    try {
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

      // update the team member name string
      const teamMemberName = document.getElementById("team-member-name");
      teamMemberName.textContent = data.fields["Full Name"];

      // save the user's time zone
      userTimeZone = data.fields["Time Zone"];

      return data.fields["ID"];

    } catch (error) {
      console.error("Error fetching custom User ID:", error);
      return null;
    }
  }

  const colorMap = {};

  // function to get a random color
  function getDistinctColor() {
    const funColors = ["#f09090","#ebbc71","#a4eb71","#71ebb4","#71dfeb","#71a2eb","#9d98eb","#e8b2ed","#faafca","#ebf065","#7dc98c","#67d0f0"];
    const randomFunColor = funColors[Math.floor(Math.random() * funColors.length)];
    return randomFunColor;
  }

  async function fetchAndPopulateDropdown(userID) {

    const airtableApiUrl = `https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Team%20Members?filterByFormula={Users}="${userID}"`;
    const dropdown = document.getElementById("team-member-dropdown-2");
    const newTeamMemberDropdown = document.getElementById("new-team-member-dropdown");
    const selectionsDiv = document.getElementById("selections-div");

    if (!dropdown) {
      console.error("Dropdown element not found.");
      return;
    }

    try {
      // Fetch team members from Airtable
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

      dropdown.innerHTML = "";
      newTeamMemberDropdown.innerHTML = "";
      selectionsDiv.innerHTML = "";

      let targetValue = "";

      // Populate Team Members
      if (data.records && data.records.length > 0) {
        data.records.forEach((record, index) => {

          if (record.fields["Deleted"] == "TRUE") {
            return;
          }

          const fullName = record.fields["Full Name"];
          if (!(fullName in colorMap)) {
            const randomColor = getDistinctColor();
            colorMap[record.fields["Full Name"]] = randomColor;
          }

          if (fullName) {
            const option = document.createElement("option");
            option.value = record.id;
            targetValue = record.id;
            option.textContent = fullName;
            const imageUrl = record.fields["Image"]?.[0]?.url || "";
            option.setAttribute("data-image-url", imageUrl);
            dropdown.appendChild(option);
            newTeamMemberDropdown.appendChild(option);

            if (index === 0 && imageUrl) {
              const imgElement = document.getElementById("team-member-image");
              if (imgElement) {
                imgElement.src = imageUrl;
              }
            }

            // populate the Team Member selection for calendar view
            const teamMemberLabel = document.createElement("label");
            teamMemberLabel.style.display = "block";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.name = "team-member";
            checkbox.checked = true;
            checkbox.value = fullName;
            teamMemberLabel.appendChild(checkbox);
            teamMemberLabel.appendChild(document.createTextNode(` ${fullName}`));
            selectionsDiv.appendChild(teamMemberLabel);
          }
        });
      } else {
        console.warn("No team members found for this user.");
      }

      // sort the dropdown to put main user first
      const optionToMove = Array.from(dropdown.options).find(
        opt => opt.value == targetValue
      );

      if (optionToMove) {
        dropdown.removeChild(optionToMove);
        dropdown.insertBefore(optionToMove, dropdown.firstChild);
        dropdown.value = targetValue;
      }

    } catch (error) {

      console.error("Error:", error);

    }
	}


  async function populateActivityDropdown(userID) {

    const airtableApiUrl = `https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Activities?filterByFormula={Users}="${userID}"`;
    const activityDropdown = document.getElementById("choose-activity-3");
    const newActivityDropdown = document.getElementById("new-activity-dropdown");

    if (!activityDropdown) {
      console.error("Activity dropdown element not found.");
      return;
    }

    try {
      // fetch activities from Airtable
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

      // clear existing options
      activityDropdown.innerHTML = "";
      newActivityDropdown.innerHTML = "";

      // populate the dropdown with Activities
      if (data.records && data.records.length > 0) {
        data.records.forEach(record => {

          // don't show deleted Activities
          if (record.fields["Deleted"] == "TRUE") {
            return;
          }

          const activityName = record.fields["Name"];

          if (activityName) {
            const option = document.createElement("option");
            option.value = record.id;
            option.textContent = activityName;
            activityDropdown.appendChild(option);
            newActivityDropdown.appendChild(option);
          }
        });
        console.log("Activity dropdown populated successfully.");

      } else {

      	const option = document.createElement("option");
        let noActivities = "You haven't created any Activities yet.";
        option.textContent = noActivities;
        activityDropdown.appendChild(option);
      	activityDropdown.disabled = true;

        const editOption = document.createElement("option");
        let editNoActivities = "No Activities found.";
        editOption.textContent = editNoActivities;
        newActivityDropdown.appendChild(editOption);
        newActivityDropdown.disabled = true;

        console.warn("No activities found for this user.");

      }
    } catch (error) {

      console.error("Error fetching activities and populating dropdown:", error);

    }
	}


  async function populateCategoryDropdown(userID) {

    const airtableApiUrl = `https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Categories?filterByFormula={Users}="${userID}"`;
    const categoryDropdown = document.getElementById("choose-category");
    const newCategoryDropdown = document.getElementById("new-category-dropdown");

    if (!categoryDropdown) {
      console.error("Category dropdown element not found.");
      return;
    }

    try {
      // fetch Categories from Airtable
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

      // clear existing options
      categoryDropdown.innerHTML = "";
      newCategoryDropdown.innerHTML = "";

      // populate the dropdown with Categories
      if (data.records && data.records.length > 0) {
        data.records.forEach(record => {

          // don't show deleted Categories
          if (record.fields["Deleted"] == "TRUE") {
            return;
          }

          const categoryName = record.fields["Name"];

          if (categoryName) {
            const option = document.createElement("option");
            option.value = record.id;
            option.textContent = categoryName;
            categoryDropdown.appendChild(option);
            newCategoryDropdown.appendChild(option);
          }
        });
        console.log("Category dropdown populated successfully.");

      } else {

      	const option = document.createElement("option");
        let noCategories = "You haven't created any Categories yet.";
        option.textContent = noCategories;
        categoryDropdown.appendChild(option);
      	categoryDropdown.disabled = true;

        const editOption = document.createElement("option");
        let editNoCategories = "No Categories found.";
        editOption.textContent = editNoCategories;
        newCategoryDropdown.appendChild(editOption);
        newCategoryDropdown.disabled = true;

        console.warn("No categories found for this user.");

      }
    } catch (error) {

      console.error("Error fetching activities and populating dropdown:", error);

    }
	}


  async function fetchActivityName(activityID) {
    const airtableApiUrl = `https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Activities/${activityID}`;

    try {
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

      // return the name of the Activity
      return data.fields["Name"];

    } catch (error) {
      console.error("Error fetching activity from Airtable:", error);
      return null;
    }
  }


  async function fetchCategoryName(categoryID) {
    const airtableApiUrl = `https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Categories/${categoryID}`;

    try {
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

      // return the name of the Cateogory
      return data.fields["Name"];

    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  }


  async function fetchTeamMemberName(teamMemberID) {
    const airtableApiUrl = `https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Team%20Members/${teamMemberID}`;

    try {
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

      // return the name of the Team Member
      return data.fields["Full Name"];

    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  }


  // function to restore ALL deleted Time Entries
  const restoreTimeEntriesButton = document.getElementById("restore-deleted-time-entries-button");
  restoreTimeEntriesButton.addEventListener("click", async function () {

    const confirmRestore = confirm("Are you sure you want to restore ALL Time Entries?");
    if (!confirmRestore) return;

    // user doesn't have any Time Entries to restore
    if (userTimeEntryIDs.length === 0) {
        alert("No Time Entries to restore.");
        return;
    }

    const airtableApiUrlForRestore = `https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Time%20Entries/`;

    const updatePayload = {
        records: userTimeEntryIDs.map(id => ({
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
        console.log("Time Entries restored successfully!");
    } else {
        console.log("Error restoring Time Entries.");
    }

  });


  async function fetchUserTimeEntries(userID) {

    const airtableApiUrl = `https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Time%20Entries?filterByFormula={Users}="${userID}"`;
		const noTimeEntriesDiv = document.querySelector('#no-time-entries-div');
    const timeEntriesDisplaySection = document.querySelector('#time-entries-display-section');

    try {
      // Fetch User's Time Entries from Airtable
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

      // Display Time Entries
      if (data.records && data.records.length > 0) {
        for (const record of data.records) {

          // add all Time Entry record IDs to userTimeEntryIDs array
          userTimeEntryIDs.push(record.id);

          // if the Time Entry is 'deleted', don't show it in results
          if (record.fields["Deleted"] == "TRUE") {

            // if there are any deleted Time Entries, show the restore button
            const restoreDeletedTimeEntriesDiv = document.getElementById("restore-deleted-time-entries-div");
            restoreDeletedTimeEntriesDiv.style.display = "flex";

            continue;
          }

          // new main div
          const newTimeEntryDiv = document.createElement("div");
          newTimeEntryDiv.style.display = "flex";
          newTimeEntryDiv.style.justifyContent = "space-between";
          newTimeEntryDiv.style.alignItems = "center";
          newTimeEntryDiv.style.border = "1px solid #e3e3e3";
          newTimeEntryDiv.style.padding = "10px";
          newTimeEntryDiv.style.paddingLeft = "25px";
          newTimeEntryDiv.style.paddingRight = "25px";
          newTimeEntryDiv.style.width = "100%";
          newTimeEntryDiv.style.margin = "10px auto";
          newTimeEntryDiv.style.borderRadius = "15px";
          newTimeEntryDiv.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";

		  // left div
          const leftDiv = document.createElement("div");
          leftDiv.style.display = "flex";
          leftDiv.style.flexDirection = "column";

          // to hold middle and right
          const rightContainer = document.createElement("div");
          rightContainer.style.display = "flex";
          rightContainer.style.alignItems = "center";

		  // new middle div
          const middleDiv = document.createElement("div");
          middleDiv.style.textAlign = "center";
          middleDiv.style.paddingRight = "30px";

		  // new right div
          const rightDiv = document.createElement("div");
          rightDiv.style.display = "flex";
          rightDiv.style.flexDirection = "column";
          rightDiv.style.alignItems = "flex-end";
          rightDiv.style.gap = "10px";

          // retrieve the Activity name
          const timeEntryActivityElement = document.createElement("p");
          timeEntryActivityElement.style.fontSize = "18px";
          timeEntryActivityElement.style.fontWeight = "700";
          const activityID = record.fields["Activities"];
          // query the Activity name
          const timeEntryActivityText = await fetchActivityName(activityID);

		  // retrieve the Category name
          const timeEntryCategoryElement = document.createElement("p");
          timeEntryCategoryElement.style.fontSize = "12px";
          timeEntryCategoryElement.style.fontWeight = "400";
          timeEntryCategoryElement.style.marginTop = "5px";
          timeEntryCategoryElement.style.paddingLeft = "15px";
          const categoryID = record.fields["Categories"];
          // query the Category name
          const timeEntryCategoryText = await fetchCategoryName(categoryID);

          if (timeEntryActivityText && timeEntryCategoryText) {
          	const tempTitleString = timeEntryActivityText + " : " + timeEntryCategoryText;
            timeEntryActivityElement.textContent = tempTitleString;
            leftDiv.appendChild(timeEntryActivityElement);
          }

          const timeEntryTeamMemberElement = document.createElement("p");
          timeEntryTeamMemberElement.style.fontSize = "12px";
          timeEntryTeamMemberElement.style.fontWeight = "400";
          timeEntryTeamMemberElement.style.marginTop = "5px";
          timeEntryTeamMemberElement.style.paddingLeft = "15px";
          const teamMemberID = record.fields["Team Members"];
          const timeEntryTeamMember = await fetchTeamMemberName(teamMemberID);
          const timeEntryTeamMemberText = `Team Member: ${timeEntryTeamMember}`;

          if (timeEntryTeamMemberText) {
            timeEntryTeamMemberElement.textContent = timeEntryTeamMemberText;
            leftDiv.appendChild(timeEntryTeamMemberElement);
          }

          const timeEntryNotesElement = document.createElement("p");
          timeEntryNotesElement.style.fontSize = "12px";
          timeEntryNotesElement.style.fontWeight = "400";
          timeEntryNotesElement.style.marginTop = "5px";
          timeEntryNotesElement.style.paddingLeft = "15px";
          const notes = record.fields["Notes"] || "None";
          const timeEntryNotes = `Notes: ${notes}`;

          if (timeEntryNotes) {
            timeEntryNotesElement.textContent = timeEntryNotes;
            leftDiv.appendChild(timeEntryNotesElement);
          }

          const timeEntryDateElement = document.createElement("p");
          timeEntryDateElement.style.fontSize = "14px";
          timeEntryDateElement.style.fontWeight = "400";
          timeEntryDateElement.style.marginTop = "5px";
          timeEntryDateElement.style.paddingLeft = "15px";
          const databaseDate = record.fields["Date"];
          const { DateTime } = luxon;
          const timeEntryDate = DateTime
            .fromISO(databaseDate, { zone: "utc" })
            .setZone(userTimeZone)
            .toFormat("MMM dd, yyyy 'at' h:mm a");

          if (timeEntryDate) {
            timeEntryDateElement.textContent = timeEntryDate;
            rightDiv.appendChild(timeEntryDateElement);
          }

          const timeEntryTimeElement = document.createElement("p");
          timeEntryTimeElement.style.fontSize = "25px";
          timeEntryTimeElement.style.fontWeight = "800";
          timeEntryTimeElement.style.marginTop = "10px";
          const timeEntryTime = record.fields["Time"];

          let finalTimeEntryTime = '00:00';
          const timeEntryHours = Math.floor(timeEntryTime / 3600);
          const timeEntryMinutes = Math.floor((timeEntryTime % 3600) / 60);
          const formattedTimeEntryHours = String(timeEntryHours).padStart(2, "0");
          const formattedTimeEntryMinutes = String(timeEntryMinutes).padStart(2, "0");
          finalTimeEntryTime = `${formattedTimeEntryHours}:${formattedTimeEntryMinutes}`;
          if (timeEntryTime) {
            timeEntryTimeElement.textContent = finalTimeEntryTime;
            middleDiv.appendChild(timeEntryTimeElement);
          }

          // for the calendar view
          const totalMinutes = timeEntryTime / 60;
          const title = `${record.fields["Name (from Activities)"]}:${finalTimeEntryTime}`;
          const calendarEntry = {};
          const teamMemberColor = colorMap[record.fields["Full Name (from Team Members)"]];
          const start = DateTime.fromISO(databaseDate);
          const end = start.plus({ minutes: totalMinutes });
          const duration = `${start.toFormat("h:mm a")} - ${end.toFormat("h:mm a")}`;
          const formattedDate = start.toFormat("MMMM d, yyyy 'at' h:mm a");

          calendarEntry["start"] = start.toISO();
          calendarEntry["end"] = end.toISO();
          calendarEntry["title"] = title;
          calendarEntry["color"] = teamMemberColor;

          calendarEntry.extendedProps = {
            duration: duration,
            teamMember: record.fields["Full Name (from Team Members)"],
            notes: record.fields["Notes"],
            category: record.fields["Name (from Categories)"],
            activity: record.fields["Name (from Activities)"],
            time: finalTimeEntryTime,
            date: formattedDate,
          };

          timeEntryDetails.push(calendarEntry);

          // create a delete button only if the tax year is unlocked
          let deleteTimeEntryButton;
          if (record.fields["Locked"] == "FALSE") {
            // soft delete button
            deleteTimeEntryButton = document.createElement("button");
            const deleteImage = document.createElement('img');
            deleteImage.src = 'https://cdn.prod.website-files.com/672e681bbcdefdf7a11dd8ca/683b299239d69308b3d1fd2c_delete.png';
            deleteImage.alt = 'Delete';
            deleteImage.classList.add("delete-image");
            deleteTimeEntryButton.appendChild(deleteImage);
            deleteTimeEntryButton.classList.add("delete-time-entry-button");
            // for the delete button ID I am using the Time Entry ID so we
            // know what to delete
            deleteTimeEntryButton.id = record.id;

            deleteTimeEntryButton.addEventListener("click", async function () {

              const confirmDelete = confirm("Are you sure you want to delete this Time Entry?");
              if (!confirmDelete) return;

              // change Deleted to TRUE
              const timeEntryRecordId = deleteTimeEntryButton.id;
              const airtableApiUrlForUpdates = `https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Time%20Entries/${timeEntryRecordId}`;
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
                  console.log("Time Entry updated successfully!");
              } else {
                  console.log("Error updating Time Entry.");
              }

            });
          }

          const duplicateTimeEntryButton = document.createElement("button");
          duplicateTimeEntryButton.innerText = "Duplicate";
          duplicateTimeEntryButton.style.color = "#348feb";
          duplicateTimeEntryButton.style.backgroundColor = "white";

          duplicateTimeEntryButton.classList.add("duplicate-time-entry-button");
          // id is record.id-duplicate
          duplicateTimeEntryButton.id = `${record.id}-duplicate`;

          // show a lock, locked if the entry year is locked, otherwise unlcoked
          const lockImage = document.createElement("img");

          if (record.fields["Locked"] == "FALSE") {
            lockImage.src = "https://cdn.prod.website-files.com/672e681bbcdefdf7a11dd8ca/67f4215f5db49131f6daca36_unlocked_icon.png";
            lockImage.alt = "Unlocked";
            lockImage.style.width = "55px";
            lockImage.style.height = "50px";

          } else {
            lockImage.src = "https://cdn.prod.website-files.com/672e681bbcdefdf7a11dd8ca/67f4215f78ba851b4b97d57d_locked_icon.png";
            lockImage.alt = "Locked";
            lockImage.style.width = "55px";
            lockImage.style.height = "50px";
          }

          duplicateTimeEntryButton.addEventListener("click", async function () {

            const addEntryButton = document.getElementById("add-entry-button");
            const pickTeamMemberDropdown = document.getElementById("team-member-dropdown-2");
            const formDate = document.querySelector(".form-date-field");
            const formTimeHours = document.getElementById("hours");
            const formTimeMinutes = document.getElementById("minutes");
            const formActivityDropdown = document.getElementById("choose-activity-3");
            const formCategoryDropdown = document.getElementById("choose-category");
            const formNotes = document.getElementById("notes-2");

            // populate the form
            const timeEntryDate = record.fields["Date"];
            const timeEntryTime = record.fields["Time"];
            const timeEntryHours = Math.floor(timeEntryTime / 3600);
            const timeEntryMinutes = Math.floor((timeEntryTime % 3600) / 60);
            const timeEntryNotes = record.fields["Notes"] || "";
            const timeEntryActivityID = record.fields["Activities"];
            const timeEntryCategoryID = record.fields["Categories"];
            const timeEntryTeamMemberID = record.fields["Team Members"];

            pickTeamMemberDropdown.value = timeEntryTeamMemberID;
            pickTeamMemberDropdown.dispatchEvent(new Event("change"));
            formDate.value = timeEntryDate;
            formTimeHours.value = timeEntryHours;
            formTimeMinutes.value = timeEntryMinutes;
            formActivityDropdown.value = timeEntryActivityID;
            formActivityDropdown.dispatchEvent(new Event("change"));
            formCategoryDropdown.value = timeEntryCategoryID;
            formCategoryDropdown.dispatchEvent(new Event("change"));
            formNotes.value = timeEntryNotes;

            // open side panel
            addEntryButton.click();
          });

          // edit button
          const editTimeEntryButton = document.createElement("button");
          const editImage = document.createElement('img');
          editImage.src = 'https://cdn.prod.website-files.com/672e681bbcdefdf7a11dd8ca/683b2992ccc2f9f597ff24d9_editing.png';
          editImage.alt = 'Edit';
          editImage.classList.add("edit-image");
          editTimeEntryButton.appendChild(editImage);
          editTimeEntryButton.classList.add("edit-time-entry-button");
          editTimeEntryButton.id = "edit-" + record.id;

          editTimeEntryButton.addEventListener("click", function () {

            const editPopupBackground = document.getElementById("edit-time-entry-background");
            editPopupBackground.style.display = "flex";
            editPopupBackground.style.opacity = "100%";

            const timeEntryDate = record.fields["Date"];
            const timeEntryTime = record.fields["Time"];
            const timeEntryHours = Math.floor(timeEntryTime / 3600);
            const timeEntryMinutes = Math.floor((timeEntryTime % 3600) / 60);

            const currentTeamMemberLabel = document.getElementById("current-team-member-label");
            const newTeamMemberDropdown = document.getElementById("new-team-member-dropdown");
            const nameToSelect = record.fields["Full Name (from Team Members)"][0];
            currentTeamMemberLabel.innerText = "Current Team Member: " + nameToSelect;
            for (let option of newTeamMemberDropdown.options) {
                if (option.textContent === nameToSelect) {
                    newTeamMemberDropdown.value = option.value;
                    break;
                }
            }            
            newTeamMemberDropdown.dispatchEvent(new Event("change"));
            const currentDateTimeLabel = document.getElementById("current-date-time-label");
            const newTimeEntryDate = document.getElementById("new-date-time-input");
            const editDate = record.fields["Date"];
            currentDateTimeLabel.innerText = "Current Date + Start Time: " + editDate.slice(0, 16);
            newTimeEntryDate.value = editDate.slice(0, 16);

            const currentTotalTimeLabel = document.getElementById("current-total-time-label");
            const currentHoursInput = document.getElementById("edit-hours");
            const currentMinutesInput = document.getElementById("edit-minutes");
            currentTotalTimeLabel.innerText = "Current Total Time: " + finalTimeEntryTime;
            currentHoursInput.value = timeEntryHours;
            currentMinutesInput.value = timeEntryMinutes;

            const currentActivtyLabel = document.getElementById("current-activity-label");
            const newActivityDropdown = document.getElementById("new-activity-dropdown");
            currentActivtyLabel.innerText = "Current Activity: " + record.fields["Name (from Activities)"];
            newActivityDropdown.value = record.fields["Activities"];
            newActivityDropdown.dispatchEvent(new Event("change"));

            const currentCategoryLabel = document.getElementById("current-category-label");
            const newCategoryDropdown = document.getElementById("new-category-dropdown");
            currentCategoryLabel.innerText = "Current Category: " + record.fields["Name (from Categories)"];
            newCategoryDropdown.value = record.fields["Categories"];
            newCategoryDropdown.dispatchEvent(new Event("change"));

            const currentNotesLabel = document.getElementById("current-notes-label");
            const newNotesTextfield = document.getElementById("new-notes-textfield");
            currentNotesLabel.innerText = "Current Notes: " + (record.fields["Notes"] || "No notes.");
            newNotesTextfield.value = (record.fields["Notes"] || "No notes.");

            const timeEntryRecordId = document.getElementById("time-entry-record-id");
            timeEntryRecordId.value = record.id;

          });

        const submitEditsButton = document.getElementById("edit-form-submit-button");
        submitEditsButton.addEventListener("click", async function () {

            const newTeamMemberValue = document.getElementById("new-team-member-dropdown").value;
            const newDateTimeValue = document.getElementById("new-date-time-input").value;
            const newHours = document.getElementById("edit-hours").value;
            const newMinutes = document.getElementById("edit-minutes").value;
            let newHoursInSeconds = Number(newHours) * 3600 || 0;
            let newMinutesInSeconds = Number(newMinutes) * 60 || 0;
            let newTotalSeconds = newHoursInSeconds + newMinutesInSeconds;
            //const newHiddenTimeField = document.getElementById("new-hidden-seconds-field");
            //newHiddenTimeField.value = newTotalSeconds;
            const newActivityValue = document.getElementById("new-activity-dropdown").value;
            const newCategoryValue = document.getElementById("new-category-dropdown").value;
            const newNotesValue = document.getElementById("new-notes-textfield").value || "No Notes.";

            if (newTeamMemberValue == "" || newDateTimeValue == "" || newHours == "" ||
                newMinutes == "" || newActivityValue == "" || newCategoryValue == "") {
                alert("Fill in the form properly.");
                return;
            }

            // update
            const timeEntryRecordId = document.getElementById("time-entry-record-id").value;
            const airtableApiUrlForUpdates = `https://api.airtable.com/v0/appOIyXSdFDXsvc4B/Time%20Entries/${timeEntryRecordId}`;
            const updatedFields = { 
                "Date": newDateTimeValue,
                "Time": newTotalSeconds,
                "Notes": newNotesValue,
                "Activities": [newActivityValue],
                "Categories": [newCategoryValue],
                "Team Members": [newTeamMemberValue],
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
            const editTeamMemberDetailsDiv = document.getElementById("edit-team-member-details-div");
            if (updateResponse.ok) {
                editTeamMemberDetailsDiv.style.display = "none";
                responseDiv.style.display = "flex";
            } else {
                editTeamMemberDetailsDiv.style.display = "none";
                const errorDetails = await updateResponse.json();
                const responseLabel = document.getElementById("edit-response-label");
                responseLabel.innerText = "Error submitting edits: " + errorDetails;
                responseDiv.style.display = "flex";
            }
        });

          if (timeEntriesDisplaySection) {
          	newTimeEntryDiv.appendChild(leftDiv);

            if (record.fields["Locked"] == "FALSE") {
              rightDiv.appendChild(deleteTimeEntryButton);
              rightDiv.appendChild(editTimeEntryButton);
            }

            rightDiv.appendChild(duplicateTimeEntryButton);
            rightDiv.appendChild(lockImage);
            rightContainer.appendChild(middleDiv);
            rightContainer.appendChild(rightDiv);
            newTimeEntryDiv.appendChild(rightContainer);
            timeEntriesDisplaySection.appendChild(newTimeEntryDiv);

          } else {
            console.error("Section not found.");
          }

        }
      } else {
        // no Activities found
        noTimeEntriesDiv.style.display = "flex";
        console.warn("No Time Entries found");
      }
    } catch (error) {

      console.error("Error:", error);
    }
	}

  function createCalendar() {

    const calendarSection = document.getElementById("calendar-section");
    const calendarView = document.getElementById("calendar-view");
    var calendar = new FullCalendar.Calendar(calendarView, {
      id: "calendar",
      timeZone: userTimeZone,
      initialView: 'dayGridMonth',
      headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay"
        },
      events: timeEntryDetails,
      selectable: true,
      eventClick: function(info) {
            showPopup(info.event, info.jsEvent);
      },
    });

    calendar.render();
    calendarSection.style.display = "none";

    // store reference for later
    window.calendar = calendar;
  }


  function showPopup(event, jsEvent) {

    const calendarSection = document.querySelector(".calendar-section");
    const existingPopupDiv = document.getElementById("calendar-event-popup");

    // if there is already a popup, remove it and create a new one
    if (existingPopupDiv) {
      existingPopupDiv.remove();
    }

    const eventPopup = document.createElement("div");
    eventPopup.id = "calendar-event-popup";
    eventPopup.classList.add("event-popup");
    eventPopup.style.display = "flex";
    eventPopup.style.flexDirection = "column";
    eventPopup.style.gap = "5px";
    eventPopup.style.minWidth = "250px";
    eventPopup.style.minHeight = "200px";
    eventPopup.style.height = "auto";
    eventPopup.style.width = "auto";
    eventPopup.style.border = "2px solid #9fb8ee";
    eventPopup.style.borderRadius = "10px";
    eventPopup.style.padding = "15px";
    eventPopup.style.position = "absolute";
    eventPopup.style.zIndex = "1000";
    eventPopup.style.backgroundColor = "white";

    const popupTitle = document.createElement("label");
    popupTitle.style.color = "black";
    popupTitle.style.fontSize = "16px";
    popupTitle.style.fontWeight = "550";
    popupTitle.style.padding = "10px 0px";
    popupTitle.style.borderBottom = "1px solid #9fb8ee";
    popupTitle.innerText = event.title;

    const popupDate = document.createElement("label");
    popupDate.style.color = "black";
    popupDate.style.fontSize = "12px";
    popupDate.style.fontWeight = "450";
    popupDate.style.paddingLeft = "10px";
    popupDate.innerText = "Date: " + event.extendedProps.date;

    const popupDuration = document.createElement("label");
    popupDuration.style.color = "black";
    popupDuration.style.fontSize = "12px";
    popupDuration.style.fontWeight = "450";
    popupDuration.style.paddingLeft = "10px";
    popupDuration.innerText = "Duration: " + event.extendedProps.duration;

    const popupTime = document.createElement("label");
    popupTime.style.color = "black";
    popupTime.style.fontSize = "12px";
    popupTime.style.fontWeight = "450";
    popupTime.style.paddingLeft = "10px";
    popupTime.innerText = "Time: " + event.extendedProps.time;

    const popupTeamMember = document.createElement("label");
    popupTeamMember.style.color = "black";
    popupTeamMember.style.fontSize = "12px";
    popupTeamMember.style.fontWeight = "450";
    popupTeamMember.style.paddingLeft = "10px";
    popupTeamMember.innerText = "Team Member: " + event.extendedProps.teamMember;

    const popupCategory = document.createElement("label");
    popupCategory.style.color = "black";
    popupCategory.style.fontSize = "12px";
    popupCategory.style.fontWeight = "450";
    popupCategory.style.paddingLeft = "10px";
    popupCategory.innerText = "Category: " + event.extendedProps.category;

    const popupActivity = document.createElement("label");
    popupActivity.style.color = "black";
    popupActivity.style.fontSize = "12px";
    popupActivity.style.fontWeight = "450";
    popupActivity.style.paddingLeft = "10px";
    popupActivity.innerText = "Activity: " + event.extendedProps.activity;

    const popupNotes = document.createElement("label");
    popupNotes.style.color = "black";
    popupNotes.style.fontSize = "12px";
    popupNotes.style.fontWeight = "450";
    popupNotes.style.paddingLeft = "10px";
    popupNotes.innerText = "Notes: " + event.extendedProps.notes;

    const closePopupButton = document.createElement("button");
    closePopupButton.style.width = "30px";
    closePopupButton.style.height = "30px";
    closePopupButton.style.backgroundColor = "white";
    closePopupButton.style.border = "0.5px solid black";
    closePopupButton.style.borderRadius = "15px";
    closePopupButton.style.position = "absolute";
    closePopupButton.style.top = "10px";
    closePopupButton.style.right = "10px";
    closePopupButton.style.marginBottom = "15px";
    closePopupButton.innerText = "X";

    closePopupButton.addEventListener("click", function () {
      eventPopup.style.display = "none";
    });

    // position the popup near the clicked event
    eventPopup.style.left = (jsEvent.pageX - 260) + "px";
    eventPopup.style.top = (jsEvent.pageY - 260) + "px";

    eventPopup.appendChild(closePopupButton);
    eventPopup.appendChild(popupTitle);
    eventPopup.appendChild(popupDate);
    eventPopup.appendChild(popupDuration);
    eventPopup.appendChild(popupTime);
    eventPopup.appendChild(popupTeamMember);
    eventPopup.appendChild(popupCategory);
    eventPopup.appendChild(popupActivity);
    eventPopup.appendChild(popupNotes);
    calendarSection.appendChild(eventPopup);

    // if the user clicks outside the popup, remove it
    setTimeout(() => {
    const outsideClickHandler = (e) => {
      const clickedInsidePopup = eventPopup.contains(e.target);
      const clickedOnEvent = e.target.classList.contains("event-popup");

      if (!clickedInsidePopup && !clickedOnEvent) {
        eventPopup.remove();
        document.removeEventListener("click", outsideClickHandler);
      }
    };

    document.addEventListener("click", outsideClickHandler);
  }, 0);
}

