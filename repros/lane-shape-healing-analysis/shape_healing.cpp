#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepBuilderAPI_MakeWire.hxx>
#include <BRep_Tool.hxx>
#include <Precision.hxx>
#include <ShapeExtend_Status.hxx>
#include <ShapeFix_Wire.hxx>
#include <Standard_VersionInfo.hxx>
#include <TopExp.hxx>
#include <TopoDS_Vertex.hxx>
#include <TopoDS_Wire.hxx>
#include <gp_Pnt.hxx>

#include <cmath>
#include <iomanip>
#include <iostream>
#include <locale>
#include <sstream>
#include <string>

namespace
{
std::string JsonEscape(const std::string& input)
{
  std::ostringstream out;
  out << '"';
  for (const unsigned char c : input)
  {
    switch (c)
    {
      case '\\':
        out << "\\\\";
        break;
      case '"':
        out << "\\\"";
        break;
      case '\b':
        out << "\\b";
        break;
      case '\f':
        out << "\\f";
        break;
      case '\n':
        out << "\\n";
        break;
      case '\r':
        out << "\\r";
        break;
      case '\t':
        out << "\\t";
        break;
      default:
        if (c < 0x20)
        {
          out << "\\u" << std::hex << std::setw(4) << std::setfill('0')
              << static_cast<int>(c) << std::dec << std::setw(0);
        }
        else
        {
          out << static_cast<char>(c);
        }
        break;
    }
  }
  out << '"';
  return out.str();
}

struct WireGap
{
  Standard_Boolean hasVertices = Standard_False;
  Standard_Boolean topoClosed = Standard_False;
  Standard_Real gap = 0.0;
  Standard_Real vFirstTol = 0.0;
  Standard_Real vLastTol = 0.0;
};

WireGap MeasureGap(const TopoDS_Wire& wire)
{
  WireGap out;
  TopoDS_Vertex vFirst;
  TopoDS_Vertex vLast;
  TopExp::Vertices(wire, vFirst, vLast);
  if (vFirst.IsNull() || vLast.IsNull())
  {
    return out;
  }

  out.hasVertices = Standard_True;
  out.topoClosed = vFirst.IsSame(vLast);

  const gp_Pnt pFirst = BRep_Tool::Pnt(vFirst);
  const gp_Pnt pLast = BRep_Tool::Pnt(vLast);
  out.gap = pFirst.Distance(pLast);

  out.vFirstTol = BRep_Tool::Tolerance(vFirst);
  out.vLastTol = BRep_Tool::Tolerance(vLast);
  return out;
}

struct FixStatus
{
  Standard_Boolean ok = Standard_False;
  Standard_Boolean done = Standard_False;
  Standard_Boolean fail = Standard_False;
};

FixStatus StatusClosedBits(const ShapeFix_Wire& fixer)
{
  FixStatus st;
  st.ok = fixer.StatusClosed(ShapeExtend_OK);
  st.done = fixer.StatusClosed(ShapeExtend_DONE);
  st.fail = fixer.StatusClosed(ShapeExtend_FAIL);
  return st;
}

FixStatus StatusConnectedBits(const ShapeFix_Wire& fixer)
{
  FixStatus st;
  st.ok = fixer.StatusConnected(ShapeExtend_OK);
  st.done = fixer.StatusConnected(ShapeExtend_DONE);
  st.fail = fixer.StatusConnected(ShapeExtend_FAIL);
  return st;
}
} // namespace

int main()
{
  std::cout.imbue(std::locale::classic());

  const char* versionStr = OCCT_Version_String_Extended();
  const char* devStr = OCCT_DevelopmentVersion();

  // Build a nearly-closed rectangle wire with a small endpoint gap.
  const Standard_Real gapY = 5e-6; // chosen to be fixable (>> Precision::Confusion()) but small.

  const gp_Pnt p0(0.0, 0.0, 0.0);
  const gp_Pnt p1(10.0, 0.0, 0.0);
  const gp_Pnt p2(10.0, 10.0, 0.0);
  const gp_Pnt p3(0.0, 10.0, 0.0);
  const gp_Pnt p4(0.0, gapY, 0.0); // slightly off from p0

  BRepBuilderAPI_MakeWire mw;
  mw.Add(BRepBuilderAPI_MakeEdge(p0, p1));
  mw.Add(BRepBuilderAPI_MakeEdge(p1, p2));
  mw.Add(BRepBuilderAPI_MakeEdge(p2, p3));
  mw.Add(BRepBuilderAPI_MakeEdge(p3, p4));
  const TopoDS_Wire wire = mw.Wire();

  const WireGap before = MeasureGap(wire);

  ShapeFix_Wire fixer;
  fixer.Load(wire);
  fixer.ModifyTopologyMode() = Standard_True;
  fixer.ModifyGeometryMode() = Standard_True;
  fixer.ClosedWireMode() = Standard_True;
  fixer.SetPrecision(Precision::Confusion());
  fixer.SetMaxTolerance(1e-4);

  const Standard_Boolean didReorder = fixer.FixReorder();
  const Standard_Boolean didConnected = fixer.FixConnected(1e-4);
  const Standard_Boolean didClosed = fixer.FixClosed(1e-4);
  const TopoDS_Wire wireFixed = fixer.Wire();
  const WireGap after = MeasureGap(wireFixed);
  const FixStatus stConn = StatusConnectedBits(fixer);
  const FixStatus stClosed = StatusClosedBits(fixer);

  std::cout << "{\n";
  std::cout << "  \"meta\": {\n";
  std::cout << "    \"occt_version\": " << JsonEscape(versionStr == nullptr ? "" : versionStr) << ",\n";
  std::cout << "    \"occt_dev\": " << JsonEscape(devStr == nullptr ? "" : devStr) << "\n";
  std::cout << "  },\n";
  std::cout << "  \"params\": {\n";
  std::cout << "    \"gap_y\": " << std::setprecision(17) << gapY << ",\n";
  std::cout << "    \"precision_confusion\": " << std::setprecision(17) << Precision::Confusion() << ",\n";
  std::cout << "    \"max_tolerance\": " << std::setprecision(17) << 1e-4 << "\n";
  std::cout << "  },\n";
  std::cout << "  \"before\": {\n";
  std::cout << "    \"has_vertices\": " << (before.hasVertices ? "true" : "false") << ",\n";
  std::cout << "    \"topo_closed\": " << (before.topoClosed ? "true" : "false") << ",\n";
  std::cout << "    \"gap\": " << std::setprecision(17) << before.gap << ",\n";
  std::cout << "    \"v_first_tolerance\": " << std::setprecision(17) << before.vFirstTol << ",\n";
  std::cout << "    \"v_last_tolerance\": " << std::setprecision(17) << before.vLastTol << "\n";
  std::cout << "  },\n";
  std::cout << "  \"fix\": {\n";
  std::cout << "    \"fix_reorder_return\": " << (didReorder ? "true" : "false") << ",\n";
  std::cout << "    \"fix_connected_return\": " << (didConnected ? "true" : "false") << ",\n";
  std::cout << "    \"status_connected\": { \"ok\": " << (stConn.ok ? "true" : "false")
            << ", \"done\": " << (stConn.done ? "true" : "false") << ", \"fail\": "
            << (stConn.fail ? "true" : "false") << " },\n";
  std::cout << "    \"fix_closed_return\": " << (didClosed ? "true" : "false") << ",\n";
  std::cout << "    \"status_closed\": { \"ok\": " << (stClosed.ok ? "true" : "false")
            << ", \"done\": " << (stClosed.done ? "true" : "false") << ", \"fail\": "
            << (stClosed.fail ? "true" : "false") << " }\n";
  std::cout << "  },\n";
  std::cout << "  \"after\": {\n";
  std::cout << "    \"has_vertices\": " << (after.hasVertices ? "true" : "false") << ",\n";
  std::cout << "    \"topo_closed\": " << (after.topoClosed ? "true" : "false") << ",\n";
  std::cout << "    \"gap\": " << std::setprecision(17) << after.gap << ",\n";
  std::cout << "    \"v_first_tolerance\": " << std::setprecision(17) << after.vFirstTol << ",\n";
  std::cout << "    \"v_last_tolerance\": " << std::setprecision(17) << after.vLastTol << "\n";
  std::cout << "  }\n";
  std::cout << "}\n";

  return 0;
}
