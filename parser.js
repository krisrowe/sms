/*
const singleDateExp = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s\\d+(?:,\\s(\\d+))";

function findDateRange(sourceText) {
  // Add a question mark at the end of the first single date expression, as the start date may or may not have a year,
  // but the second date MUST have a year. Before requiring the second date to include a year, at least one email 
  // resulted in a date range elsewhere in the email being matched (in the body), which was not the formal date range,
  // and therefore, no year was captured.  
  var exp = "(" + singleDateExp + "?)\\s-\\s(" + singleDateExp +")"; 
  var regExp = new RegExp(exp, "gi");  // "i" is for case insensitive
  var match = regExp.exec(sourceText);
  if (match && match.length > 0) {
    var result = { startDate: match[1], endDate: match[3] };
    if (!match[2]) {
      // When there is no year on the start date, use the year from the end date.
      result.startDate += ", " + match[4];
    }
    return result;
  } else {
    console.log("No date range found.");
  }
}
*/

function text(sourceText, regex) {
  const regExp = new RegExp(regex, 'i'); // 'i' for case-insensitive
  const match = regExp.exec(sourceText);

  if (match && match.length > 1) {
      // match[1] contains the captured group
      return match[1];
  } else {
      return ""; // or however you want to handle non-matches
  }
}

function date(sourceText, regex) {
  const regExp = new RegExp(regex, 'i');
  const match = regExp.exec(sourceText);

  if (match && match.length > 1) {
      // Parse the date string into components
      const [month, day] = match[1].split(' ');
      const currentDate = new Date();
      const year = currentDate.getFullYear(); // Assuming the year is the current year
      const dateStr = `${month} ${day}, ${year} 00:00:00`;
      return new Date(dateStr);
  } else {
      return null; // or a default Date, as per your requirement
  }
}

function amount(sourceText, regex) {
  const regExp = new RegExp(regex, 'i');
  const match = regExp.exec(sourceText);

  if (match && match.length > 1) {
      // Convert captured string to a number, removing commas
      return parseFloat(match[1].replace(/,/g, ''));
  } else {
      return 0; // or however you want to handle non-matches
  }
}

function literal(sourceText, value) {
  return value;
}

module.exports = { text, date, amount, literal };