// by Alex Dupler

//Select the measures you want to create measures for then run this script

//change the next 2 string variables for different naming conventions

//add the name of your calculation group here
string DisplayFolderMode = ;

//add the names of calc groups you want to invoke
list IncludedGroups = {""};

//add the name of any calc items you want to exclude (for example a "base value" item that is just selectedmeasure())
list ExcludedItems = {};


//
// ----- do not modify script below this line -----

//if one of the calc groups doens't exist, throw an error
 for each (var CalcGroup in IncludedGroups) {
    if Model.AllTables.Contains(measureName)

//if one of the ExcludedItems doesn't exist, throw an error

//


//check to see if dynamic measure has been created, if not create it now
//if a measure with that name alredy exists elsewhere in the model, skip it
if (!calcGroup.Measures.Contains(measureName)) {
  foreach(var m in Model.AllMeasures) {
    if (m.Name == measureName) {
      Error("This measure name already exists in table " + m.Table.Name + ". Either rename the existing measure or choose a different name for the measure in your Calculation Group.");
      return;
    };
  };
  var newMeasure = calcGroup.AddMeasure(BaseMeasure + " " + CalcItem);
  newMeasure.Expression= "Calculate(["+ BaseMeasure + ",'" + calcGroupName + "'[" +CalcItem + "])";
  newMeasure.FormatDax();
};