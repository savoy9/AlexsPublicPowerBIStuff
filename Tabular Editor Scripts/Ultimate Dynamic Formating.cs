// by Alex Dupler & Jeff Weir
// much code coppied from Johnny Winter's ultimate Dynamic Measure script

//select the measures you want your Dynamic Formating to apply to then run this script
//You want to scope the calc group to specific measures because this calc group can 
// break measures that return strings.

//change the next 2 string variables for different naming conventions

//add the name of your calculation group here
string calcGroupName = "Dynamic Formating (Calc Group)";

//add the name for the column you want to appear in the calculation group
string columnName = "Formula";


//
// ----- do not modify script below this line -----
//

if (Selected.Measures.Count == 0) {
  Error("Select one or more measures");
  return;
}

//create an OR block that will be true for any of the selected measures
string s = " ";
foreach (var m in Selected.Measures) {
    s += 
        "ISSELECTEDMEASURE ( ["
        + m.Name
        + @"] ) 
        || ";

};

//trim off the trailling OR operator
string MeasureLogic = s.Remove(s.Length-4,4) ;

//check to see if a table with this name already exists
//if it doesnt exist, create a calculation group with this name
if (!Model.Tables.Contains(calcGroupName)) {
  var cg = Model.AddCalculationGroup(calcGroupName);
  cg.Description = 
  calcGroupName + "enables you to format measures with dynamic rounding (K, M, bn, etc.) without changing the measure into a string.";
};
//set variable for the calc group
Table calcGroup = Model.Tables[calcGroupName];

//if table already exists, make sure it is a Calculation Group type
if (calcGroup.SourceType.ToString() != "CalculationGroup") {
  Error("Table exists in Model but is not a Calculation Group. Rename the existing table or choose an alternative name for your Calculation Group.");
  return;
};
//by default the calc group has a column called Name. If this column is still called Name change this in line with specfied variable
if (calcGroup.Columns.Contains("Name")) {
  calcGroup.Columns["Name"].Name = columnName;
};
calcGroup.Columns[columnName].Description = 
"Select value(s) from this column to control which formating approach is applied";

//create calculation items for each format
foreach(var cg in Model.CalculationGroups) {
  if (cg.Name == calcGroupName) { 
      if (!cg.CalculationItems.Contains("Dynamic Format - 0 dp")) {
        var newCalcItem = cg.AddCalculationItem(
        "Dynamic Format - 0 dp", "SELECTEDMEASURE()");
        newCalcItem.FormatStringExpression = 
@"IF (
    " + MeasureLogic + @",
    VAR dp = 0
    VAR dps =
        ""."" & REPT ( 0, dp )
    VAR SafeLog =
        IF (
            SELECTEDMEASURE () = 0,
            0,
            INT ( LOG ( ABS ( SELECTEDMEASURE () ), 1000 ) )
        )
    VAR Suffix =
        SWITCH ( Safelog, 1, ""K"", 2, ""M"", 3, ""bn"", 4, ""tn"", 5, ""q"" )
    VAR Commas =
        REPT ( "","", ABS ( Safelog ) )
    VAR BaseFormat =
        IF (
            dp > 0,
            ""#,##0"" & Commas & dps & Suffix & "";-#,##0"" & Commas & dps & Suffix & "";-"",
            ""#,##0"" & Suffix & Commas & "";-#,##0"" & Suffix & Commas & "";-""
        )
    VAR DollarSign =
        IF ( SEARCH ( ""$"", SELECTEDMEASUREFORMATSTRING (), 1, 0 ) > 0, 1, 0 )
    RETURN
        IF (
            SEARCH ( ""%"", SELECTEDMEASUREFORMATSTRING (), 1, 0 ) > 0,
            SELECTEDMEASUREFORMATSTRING (),
            REPT ( ""$"", DollarSign ) & BaseFormat
        ),
    SELECTEDMEASUREFORMATSTRING ()
)";
        newCalcItem.FormatDax();
      if (!cg.CalculationItems.Contains("Dynamic Format - 0 dp (All Measures)")) {
              var newCalcItem2 = cg.AddCalculationItem(
              "Dynamic Format - 0 dp (All Measures)", "SELECTEDMEASURE()");
              newCalcItem2.FormatStringExpression = 
@"VAR dp = 0
VAR dps =
    ""."" & REPT ( 0, dp )
VAR SafeLog =
    IF (
        SELECTEDMEASURE () = 0,
        0,
        INT ( LOG ( ABS ( SELECTEDMEASURE () ), 1000 ) )
    )
VAR Suffix =
    SWITCH ( Safelog, 1, ""K"", 2, ""M"", 3, ""bn"", 4, ""tn"", 5, ""q"" )
VAR Commas =
    REPT ( "","", ABS ( Safelog ) )
VAR BaseFormat =
    IF (
        dp > 0,
        ""#,##0"" & Commas & dps & Suffix & "";-#,##0"" & Commas & dps & Suffix & "";-"",
        ""#,##0"" & Suffix & Commas & "";-#,##0"" & Suffix & Commas & "";-""
    )
VAR DollarSign =
    IF ( SEARCH ( ""$"", SELECTEDMEASUREFORMATSTRING (), 1, 0 ) > 0, 1, 0 )
RETURN
    IF (
        SEARCH ( ""%"", SELECTEDMEASUREFORMATSTRING (), 1, 0 ) > 0,
        SELECTEDMEASUREFORMATSTRING (),
        REPT ( ""$"", DollarSign ) & BaseFormat
    )";
      };
    };
  };
};
